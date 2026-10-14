// Shared by rendering, local serving and static export. Code is always inert text.
const languages: Record<string, string> = {
  go: 'go',
  py: 'python',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  jsx: 'javascript',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  rs: 'rust',
  sh: 'bash',
  bash: 'bash',
  sql: 'sql',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  css: 'css',
  html: 'xml',
  xml: 'xml',
  txt: 'plaintext',
};
export const CODE_ASSET_LIMIT = 256 * 1024;
export function codeLanguage(target: string): string | undefined {
  return languages[target.split('.').pop()?.toLowerCase() || ''];
}
