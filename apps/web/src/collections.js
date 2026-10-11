import config from '../collections.config.json' with {type: 'json'};

const defaultStyle = Object.freeze({color: '#d0dbe7', marker: {shape: 'circle', hollow: false}, node: {size: 1, halo: 1, rays: 1, rayStretch: 1, rayAngle: 0}});

// Configuration is shared by Node (reader/export/retrieval) and the browser.
// Reject unsafe paths and invalid visual values before either side uses them.
export function createCollectionRegistry(entries) {
  if (!Array.isArray(entries)) throw new Error('目录配置必须是数组');
  const seen = new Set();
  const collections = entries.map(entry => {
    const fail = message => {throw new Error(`目录配置 ${entry?.id || '(未命名)'}：${message}`);};
    if (!entry || typeof entry !== 'object' || !/^[a-z][a-z0-9-]*$/.test(entry.id || '')) fail('id 必须是 content 下的单层小写目录名');
    if (seen.has(entry.id)) fail('id 重复');
    seen.add(entry.id);
    for (const key of ['label', 'description']) if (typeof entry[key] !== 'string' || !entry[key].trim()) fail(`${key} 必须是非空文本`);
    if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') fail('enabled 必须是布尔值');
    if (typeof entry.icon !== 'string' || !entry.icon.trim() || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]+$/.test(entry.icon)) fail('icon 必须是 SVG path 的 d 属性');
    if (!/^#[0-9a-f]{6}$/i.test(entry.color || '')) fail('color 必须是六位十六进制颜色');
    for (const key of ['marker', 'node']) if (entry[key] !== undefined && (!entry[key] || typeof entry[key] !== 'object' || Array.isArray(entry[key]))) fail(`${key} 必须是对象`);
    const marker = {...defaultStyle.marker, ...entry.marker};
    if (!['circle', 'diamond', 'square'].includes(marker.shape) || typeof marker.hollow !== 'boolean') fail('marker 的形状或 hollow 无效');
    const node = {...defaultStyle.node, ...entry.node};
    for (const [key, min, max] of [['size', .5, 2], ['halo', 0, 2], ['rays', 0, 2], ['rayStretch', .5, 2], ['rayAngle', -180, 180]]) {
      if (!Number.isFinite(node[key]) || node[key] < min || node[key] > max) fail(`node.${key} 应在 ${min} 到 ${max} 之间`);
    }
    return {...entry, enabled: entry.enabled !== false, marker, node};
  });
  const byId = new Map(collections.map(entry => [entry.id, entry]));
  return {
    collections,
    directories: collections.filter(entry => entry.enabled).map(entry => entry.id),
    label: id => byId.get(id)?.label || id,
    style: id => byId.get(id) || defaultStyle,
    icons: Object.fromEntries(collections.map(entry => [entry.id, {label: `${entry.label} · ${entry.description}`, path: entry.icon}])),
  };
}

export const collectionRegistry = createCollectionRegistry(config);
export const CONTENT_COLLECTIONS = collectionRegistry.directories;
export const collectionLabel = collectionRegistry.label;
export const collectionIcons = collectionRegistry.icons;
export const collectionStyle = collectionRegistry.style;
export const collectionMarkerStyle = id => {
  const {color, marker} = collectionStyle(id);
  return {'--collection-color': color, '--collection-fill': marker.hollow ? 'transparent' : color,
    '--collection-radius': marker.shape === 'circle' ? '50%' : '1px',
    '--collection-rotation': marker.shape === 'diamond' ? '45deg' : '0deg'};
};
