import type { ReaderNode } from '../types/graph.ts';
// Scope selects documents; incoming references always come from the full library.
export function dashboardInsights(documents: ReaderNode[], category: string | null = null) {
  const index = new Map(documents.map((doc) => [doc.id, doc]));
  const incoming = new Map(documents.map((doc) => [doc.id, new Set<string>()]));
  const outgoing = new Map(documents.map((doc) => [doc.id, new Set<string>()]));
  for (const doc of documents)
    for (const ref of doc.references || []) {
      if (ref.id === doc.id || !index.has(ref.id)) continue;
      incoming.get(ref.id).add(doc.id);
      outgoing.get(doc.id).add(ref.id);
    }
  const scoped = documents.filter(
    (doc) => category === null || (doc.category?.trim() || '') === category,
  );
  const readings = scoped.filter((doc) => doc.collection === 'readings');
  const domains = new Map<string, ReaderNode[]>();
  let withSource = 0;
  for (const doc of readings) {
    const hosts = new Set<string>();
    for (const source of doc.sources || []) {
      const raw = String(source).trim();
      const target = /^\[[^\]]+\]\((\S+)\)/.exec(raw)?.[1] || raw;
      try {
        const url = new URL(target);
        if (['http:', 'https:'].includes(url.protocol))
          hosts.add(url.hostname.replace(/^www\./, ''));
      } catch {
        /* Non-URL source labels cannot be grouped by domain. */
      }
    }
    if (hosts.size) withSource++;
    for (const host of hosts) {
      if (!domains.has(host)) domains.set(host, []);
      domains.get(host).push(doc);
    }
  }
  const citedReadings = readings.filter((doc) =>
    [...incoming.get(doc.id)].some((id) => ['inbox', 'notes'].includes(index.get(id).collection)),
  );
  const connected = scoped.filter((doc) => incoming.get(doc.id).size || outgoing.get(doc.id).size);
  const ranked = scoped
    .filter((doc) => incoming.get(doc.id).size)
    .sort(
      (a, b) =>
        incoming.get(b.id).size - incoming.get(a.id).size ||
        a.title.localeCompare(b.title, 'zh-CN'),
    );
  return {
    scoped,
    readings,
    withSource,
    citedReadings,
    connected,
    isolated: scoped.filter((doc) => !incoming.get(doc.id).size && !outgoing.get(doc.id).size),
    ranked,
    incoming,
    domains: [...domains]
      .map(([host, docs]) => ({ host, docs }))
      .sort((a, b) => b.docs.length - a.docs.length || a.host.localeCompare(b.host)),
    categories: [...new Set(documents.map((doc) => doc.category?.trim() || ''))].sort((a, b) =>
      a.localeCompare(b, 'zh-CN'),
    ),
  };
}
