import React from 'react';
import { collectionIcons } from '../collections.ts';

export function CollectionIcon({ collection }: { collection?: string }) {
  const icon = collectionIcons[collection!];
  if (!icon) return null;
  return (
    <svg
      className="collection-title-icon"
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={icon.label}
    >
      <path d={icon.path} />
    </svg>
  );
}
