// Shared collection scope for the reader, static export and Agent retrieval.
export const CONTENT_COLLECTIONS = ['notes', 'inbox', 'readings'];
export const collectionLabel = collection => ({notes: 'Notes', inbox: 'Inbox', readings: 'Readings'}[collection] || collection);

// Trusted, monochrome line icons; provenance comes from the resolved target's path.
export const collectionIcons = {
  inbox: {label: 'Inbox · 待整理', path: 'M4 4h16l2 10v6H2v-6L4 4Z M2 14h6l2 3h4l2-3h6'},
  notes: {label: 'Notes · 整理好的笔记', path: 'M14 2H5v20h14V7l-5-5Z M14 2v5h5 M8 14l3 3 5-6'},
  readings: {label: 'Readings · 外部资料导读', path: 'M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z M12 5v16'},
};
