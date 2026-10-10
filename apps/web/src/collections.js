// Shared collection scope for the reader, static export and Agent retrieval.
export const CONTENT_COLLECTIONS = ['notes', 'inbox', 'readings'];
export const collectionLabel = collection => ({notes: 'Notes', inbox: 'Inbox', readings: 'Readings'}[collection] || collection);
