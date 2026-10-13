import { documentIcon, checkPath, type StatefulDocument } from '../document-state.ts';
export function CollectionIcon(doc: StatefulDocument) {
  const icon = documentIcon(doc);
  if (!icon) return null;
  return (
    <svg
      className="collection-title-icon"
      data-state={doc.state || ''}
      style={{ color: icon.color }}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={icon.label}
    >
      <path d={icon.path} />
      {icon.complete && <path className="state-check" d={checkPath} />}
    </svg>
  );
}
