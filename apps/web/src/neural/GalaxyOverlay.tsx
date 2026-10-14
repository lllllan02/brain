import { useSyncExternalStore, type ComponentProps } from 'react';
import { GalaxyLabels } from './GalaxyLabels.tsx';
import { ReadingTrail } from './ReadingHistory.tsx';
import type { createSceneOverlay } from './scene-overlay.ts';

export function GalaxyOverlay({
  store,
  labelProps,
  trailProps,
}: {
  store: ReturnType<typeof createSceneOverlay>;
  labelProps: Omit<ComponentProps<typeof GalaxyLabels>, 'labels'>;
  trailProps: Omit<ComponentProps<typeof ReadingTrail>, 'projection'> | null;
}) {
  const { labels, trail } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return (
    <>
      {trailProps && <ReadingTrail {...trailProps} projection={trail} />}
      <GalaxyLabels {...labelProps} labels={labels} />
    </>
  );
}
