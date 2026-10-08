// The reader graph also contains navigation hubs. Only notes and real references
// enter the galaxy; a shared category never invents a relationship.
export function galaxyData(graph) {
  const documents = graph.nodes.filter(node => node.module);
  const indices = new Map(documents.map((node, i) => [node.id, i]));
  const nodes = documents.map(node => ({
    id: node.id, name: node.title, folderTop: node.module,
    degree: node.deg, inDegree: node.in, outDegree: node.out,
    fileSize: new TextEncoder().encode(node.body || '').length,
    inbox: node.collection === 'inbox',
    tags: node.tags || [], unresolved: false, tag: false,
  }));
  const links = graph.links.filter(link => link.kind === 'wiki' && indices.has(link.a) && indices.has(link.b))
    .map(link => ({source: indices.get(link.a), target: indices.get(link.b)}));
  return {nodes, links};
}

export function galaxyFocus(data, selected, category, tag = null) {
  const index = data.nodes.findIndex(node => node.id === selected);
  const bright = new Set();
  const links = [];
  if (index >= 0) {
    bright.add(index);
    data.links.forEach((link, i) => {
      if (link.source === index || link.target === index) {
        bright.add(link.source); bright.add(link.target); links.push(i);
      }
    });
  } else if (category || tag) {
    data.nodes.forEach((node, i) => { if (tag ? node.tags?.includes(tag) : node.folderTop === category) bright.add(i); });
    data.links.forEach((link, i) => {
      if (bright.has(link.source) && bright.has(link.target)) links.push(i);
    });
  }
  return {index, bright, links, active: index >= 0 || Boolean(category || tag)};
}
