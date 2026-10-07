// Category mode keeps each preset's spatial and atmospheric identity.
const styles = {
  galaxy: {id: 'galaxy', depth: .015, nodeScale: 1.4, linkOpacity: .022, background: 0, starfield: .32, gap: 65},
  nebula: {id: 'nebula', depth: .45, nodeScale: 1.5, linkOpacity: .025, background: 0, starfield: .27, gap: 65},
  deepfield: {id: 'deepfield', depth: 1, nodeScale: 1.8, linkOpacity: .03, background: 0, starfield: .16, gap: 65},
};
export const categoryStyle = id => styles[id] || styles.nebula;
export function categorySeed(id) {
  let value = 2166136261;
  for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619);
  return (value >>> 0) / 4294967296;
}
