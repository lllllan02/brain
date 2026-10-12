import { useCallback, useLayoutEffect, type RefObject } from 'react';
import type { createGalaxy } from '../galaxy/scene.ts';
export function useReaderLayout(
  readerRef: RefObject<HTMLDivElement | null>,
  scene: RefObject<ReturnType<typeof createGalaxy> | null>,
  documentId: string | undefined,
) {
  const syncReaderLayout = useCallback(() => {
    const panel = readerRef.current;
    if (!panel) return;
    const page = panel.closest<HTMLElement>('.galaxy-page')!;
    page.style.setProperty('--reader-left', `${panel.offsetLeft}px`);
    page.style.setProperty('--reader-top', `${panel.offsetTop}px`);
    page.style.setProperty('--reader-height', `${panel.offsetHeight}px`);
    // A pointer-driven layout already supplies each intermediate size. Publish
    // the list position and camera projection together, without another tween.
    if (panel.matches('.reader-resized, .reader-resizing')) scene.current?.resizeReader();
  }, [readerRef]);
  useLayoutEffect(() => {
    const panel = readerRef.current;
    if (!panel) return;
    const page = panel.closest<HTMLElement>('.galaxy-page')!;
    syncReaderLayout();
    const observer = new ResizeObserver(syncReaderLayout);
    observer.observe(panel);
    window.addEventListener('resize', syncReaderLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncReaderLayout);
      ['--reader-left', '--reader-top', '--reader-height'].forEach((name) =>
        page.style.removeProperty(name),
      );
    };
  }, [documentId, syncReaderLayout]);
  return syncReaderLayout;
}
