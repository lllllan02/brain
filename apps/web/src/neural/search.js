const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
const collator = new Intl.Collator('zh-CN', {numeric: true});

function titleForms(title) {
  // Treat a trailing English translation as an alternate title, while keeping
  // qualifiers such as “（进阶）” and every word of the original searchable.
  const main = title.replace(/\s*\([a-z][a-z0-9 .+/#&:'’_-]*\)$/u, '').trim();
  return main !== title && /\p{Script=Han}/u.test(main) ? [title, main] : [title];
}

// Normalize once per library update, rather than rebuilding full text on each keystroke.
export function createSearchIndex(documents) {
  return documents.map(document => ({
    document,
    title: normalize(document.title),
    titles: titleForms(normalize(document.title)),
    aliases: (document.aliases || []).map(normalize),
    tags: (document.tags || []).map(normalize),
    category: normalize(document.category),
    body: normalize(document.body),
  }));
}

export function searchDocuments(index, query) {
  const phrase = normalize(query);
  if (!phrase) return [];
  const terms = [...new Set(phrase.split(' '))];
  const ranked = [];
  for (const entry of index) {
    const {title, titles, aliases, tags, category, body} = entry;
    const fields = [[title, 40], ...aliases.map(text => [text, 30]),
      ...tags.map(text => [text, 20]), [category, 15], [body, 1]];
    // Every keyword must occur, but different keywords may match different fields.
    const weights = terms.map(term => Math.max(0, ...fields.map(([text, weight]) => text.includes(term) ? weight : 0)));
    if (weights.some(weight => !weight)) continue;
    const containsAll = text => terms.every(term => text.includes(term));
    let tier;
    if (titles.includes(phrase)) tier = 10;
    else if (aliases.includes(phrase)) tier = 9;
    else if (title.includes(phrase)) tier = 8;
    else if (aliases.some(text => text.includes(phrase))) tier = 7;
    else if (containsAll(title)) tier = 6;
    else if (aliases.some(containsAll)) tier = 5;
    else if (tags.some(containsAll)) tier = 4;
    else if (containsAll(category)) tier = 3;
    else if (body.includes(phrase)) tier = 2;
    else tier = 1;
    // Repeated mentions in a long body cannot outweigh a title or alias match.
    ranked.push({document: entry.document, title, tier,
      weight: weights.reduce((sum, weight) => sum + weight, 0),
      prefix: tier === 8 && title.startsWith(phrase) ? 1 : 0,
      titleLength: [6, 8].includes(tier) ? Math.min(...titles.filter(containsAll).map(text => text.length)) : 0});
  }
  return ranked.sort((a, b) => b.tier - a.tier || b.weight - a.weight || b.prefix - a.prefix
    || a.titleLength - b.titleLength || collator.compare(a.title, b.title)
    || collator.compare(a.document.id, b.document.id)).map(result => result.document);
}
