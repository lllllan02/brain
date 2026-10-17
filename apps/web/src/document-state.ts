import {
  collectionIcons,
  collectionStyle,
  collectionLabel,
  CONTENT_COLLECTIONS,
} from './collections.ts';
import config from '../document-states.config.json' with { type: 'json' };
export type DocumentState = 'pending' | 'reading' | 'organized';
export interface StatefulDocument {
  collection?: string;
  state?: DocumentState | null;
}
export const stateLabel = (
  state: DocumentState | 'understood' | 'unread' | 'read' | null | undefined,
) => {
  const current =
    state === 'understood' || state === 'read'
      ? 'organized'
      : state === 'unread'
        ? 'pending'
        : state;
  return current ? config[current].label : '';
};
export const stateComplete = (state: DocumentState | null | undefined) => state === 'organized';
export function nextDocumentState(doc: StatefulDocument): DocumentState | null {
  if (!doc.collection || !CONTENT_COLLECTIONS.includes(doc.collection)) return null;
  return doc.state === 'pending' ? 'reading' : doc.state === 'reading' ? 'organized' : 'pending';
}
export const checkPath = 'M15 18l3 3 5-6';
export function documentAppearance(doc: StatefulDocument) {
  const base = collectionStyle(doc.collection);
  const state = doc.state ? config[doc.state] : null;
  return {
    ...base,
    color: state?.color ?? base.color,
    link: { ...base.link, ...state?.link },
    marker: { ...base.marker, ...state?.marker },
    node: { ...base.node, ...(state as { node?: Partial<typeof base.node> } | null)?.node },
  };
}
export function documentIcon(doc: StatefulDocument) {
  const icon = collectionIcons[doc.collection!];
  if (!icon) return null;
  return {
    ...icon,
    label: doc.state
      ? [collectionLabel(doc.collection), stateLabel(doc.state)].join(' · ')
      : icon.label,
    complete: stateComplete(doc.state),
    color: documentAppearance(doc).color,
  };
}
export function documentMarkerStyle(doc: StatefulDocument) {
  const { color, marker } = documentAppearance(doc);
  return {
    '--collection-color': color,
    '--collection-fill': marker.hollow ? 'transparent' : color,
    '--collection-radius': marker.shape === 'circle' ? '50%' : '1px',
    '--collection-rotation': marker.shape === 'diamond' ? '45deg' : '0deg',
  };
}
export const documentFilters = [
  ['all', '全部'],
  ...CONTENT_COLLECTIONS.map((id) => [id, collectionLabel(id)]),
  ...Object.entries(config).map(([state, value]) => [`state:${state}`, value.label]),
];
export const documentFilterLabel = (value: string) =>
  documentFilters.find(([id]) => id === value)?.[1] || value;
export const matchesDocumentFilter = (doc: StatefulDocument, value: string) =>
  value === 'all' ||
  (value.startsWith('state:') ? doc.state === value.slice(6) : doc.collection === value);
