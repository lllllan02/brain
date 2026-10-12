// Category mode keeps each preset's spatial and atmospheric identity.
const styles = {
  galaxy: {
    id: 'galaxy',
    depth: 0.015,
    nodeScale: 1.05,
    linkOpacity: 0.022,
    background: 0,
    starfield: 0.32,
    gap: 65,
  },
  nebula: {
    id: 'nebula',
    depth: 0.45,
    nodeScale: 1.12,
    linkOpacity: 0.025,
    background: 0,
    starfield: 0.27,
    gap: 65,
  },
  deepfield: {
    id: 'deepfield',
    depth: 1,
    nodeScale: 1.2,
    linkOpacity: 0.24,
    background: 0,
    starfield: 0.16,
    gap: 65,
  },
};
export const categoryStyle = (id: string) => styles[id as keyof typeof styles] || styles.nebula;
export function categorySeed(id: string) {
  let value = 2166136261;
  for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619);
  return (value >>> 0) / 4294967296;
}
