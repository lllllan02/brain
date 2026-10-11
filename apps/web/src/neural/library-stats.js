export function libraryStats(documents) {
  const collections = new Map(), categories = new Map(), tags = new Map(), references = new Set();
  const ids = new Set(documents.map(doc => doc.id));
  for (const doc of documents) {
    collections.set(doc.collection, (collections.get(doc.collection) || 0) + 1);
    const category = doc.category?.trim() || '';
    const group = categories.get(category) || {name: category, total: 0, collections: {}};
    group.total++;
    group.collections[doc.collection] = (group.collections[doc.collection] || 0) + 1;
    categories.set(category, group);
    for (const tag of new Set(doc.tags || [])) tags.set(tag, (tags.get(tag) || 0) + 1);
    for (const ref of doc.references || []) if (ref.id !== doc.id && ids.has(ref.id)) references.add(JSON.stringify([doc.id, ref.id]));
  }
  return {total: documents.length, collections, categoryCount: [...categories.keys()].filter(Boolean).length,
    categories: [...categories.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'zh-CN')),
    tagCount: tags.size, tags: [...tags].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN')),
    references: references.size};
}
