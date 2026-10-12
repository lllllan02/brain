interface Block {
  source: string;
  node: ChildNode;
}

/** Keep unchanged rendered blocks (including diagrams and selections) in the document. */
export function createArticlePatcher(article: HTMLElement) {
  let blocks: Block[] = [];
  return (html: string) => {
    const scroller = article.closest<HTMLElement>('.an-scroll');
    const scroll = scroller?.scrollTop ?? 0;
    const top = scroller?.getBoundingClientRect().top ?? 0;
    const anchors = blocks.flatMap(({ node }) =>
      node instanceof HTMLElement
        ? [
            {
              node,
              offset: node.getBoundingClientRect().top - top,
              bottom: node.getBoundingClientRect().bottom - top,
            },
          ]
        : [],
    );
    const visible = anchors.filter((anchor) => anchor.bottom > 0);
    const template = document.createElement('template');
    template.innerHTML = html;
    const reusable = new Map<string, Block[]>();
    for (const block of blocks) {
      const bucket = reusable.get(block.source) ?? [];
      bucket.push(block);
      reusable.set(block.source, bucket);
    }
    const next = [...template.content.childNodes].map((node): Block => {
      const source = node instanceof Element ? node.outerHTML : (node.textContent ?? '');
      return reusable.get(source)?.shift() ?? { source, node };
    });
    const retained = new Set(next.map(({ node }) => node));
    for (const { node } of blocks) if (!retained.has(node)) node.remove();
    let cursor = article.firstChild;
    for (const { node } of next) {
      if (node === cursor) cursor = cursor.nextSibling;
      else article.insertBefore(node, cursor);
    }
    blocks = next;
    if (scroller && scroll > 0) {
      const anchor = [...visible, ...anchors.toReversed()].find(({ node }) => retained.has(node));
      scroller.scrollTo({
        top: anchor
          ? scroller.scrollTop + anchor.node.getBoundingClientRect().top - top - anchor.offset
          : scroll,
        behavior: 'instant',
      });
    }
  };
}
