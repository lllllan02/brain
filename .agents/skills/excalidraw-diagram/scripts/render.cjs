#!/usr/bin/env node
// Local adaptation: preserve input JSON, export with pinned Excalidraw, always close browser.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const moduleUrl = 'https://esm.sh/@excalidraw/excalidraw@0.18.0?bundle&deps=@braintree/sanitize-url@7.1.1';
async function main() {
  const input = process.argv[2];
  if (!input || process.argv.length > 4) throw new Error('Usage: node render.cjs input.excalidraw [output-prefix]');
  const data = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (data.type !== 'excalidraw' || !Array.isArray(data.elements) || !data.elements.some(e => !e.isDeleted)) throw new Error('Expected a nonempty Excalidraw document');
  const prefix = path.resolve(process.argv[3] || input.replace(/\.excalidraw$/i, ''));
  fs.mkdirSync(path.dirname(prefix), { recursive: true });
  const candidates = [process.env.DIAGRAM_BROWSER_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
  const executablePath = candidates.find(p => fs.existsSync(p));
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), timeout: 20000 });
  const watchdog = setTimeout(() => { console.error('Rendering exceeded 60 seconds'); browser.close().finally(() => process.exit(1)); }, 60000);
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
    page.setDefaultTimeout(45000);
    await page.setContent('<html><body style="margin:0;background:white"><div id="root"></div></body></html>');
    const svgText = await page.evaluate(async ({ data, moduleUrl }) => {
      const { exportToSvg } = await Promise.race([
        import(moduleUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Excalidraw library load timed out')), 40000))
      ]);
      const svg = await exportToSvg({ elements: data.elements, appState: { ...data.appState, exportBackground: true, viewBackgroundColor: data.appState?.viewBackgroundColor || '#ffffff', exportWithDarkMode: false }, files: data.files || {}, exportPadding: 40 });
      document.getElementById('root').appendChild(svg);
      await document.fonts.ready;
      const serialized = new XMLSerializer().serializeToString(svg);
      const width = Number(svg.getAttribute('width'));
      const height = Number(svg.getAttribute('height'));
      if (width > 1600 && height > 0) { svg.setAttribute('width', '1600'); svg.setAttribute('height', String(height * 1600 / width)); }
      return serialized;
    }, { data, moduleUrl });
    await page.locator('#root svg').screenshot({ path: prefix + '.png', timeout: 15000 });
    fs.writeFileSync(prefix + '.svg', svgText);
    console.log(JSON.stringify({ source: path.resolve(input), png: prefix + '.png', svg: prefix + '.svg' }));
  } finally { clearTimeout(watchdog); await browser.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
