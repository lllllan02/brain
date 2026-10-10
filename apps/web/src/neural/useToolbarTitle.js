import {useLayoutEffect, useState} from 'react';

export function useToolbarTitle(readerRef, titleRef, documentId, locationKey) {
  const [visible, setVisible] = useState(false);
  useLayoutEffect(() => {
    const scroller = readerRef.current?.querySelector('.an-scroll');
    const title = titleRef.current;
    if (!scroller || !title) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const remaining = title.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top;
      // A small return margin prevents flickering at the boundary.
      setVisible(previous => remaining <= 0 || (previous && remaining < 8));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    scroller.addEventListener('scroll', schedule, {passive: true});
    const resize = new ResizeObserver(schedule);
    resize.observe(scroller);
    resize.observe(title);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', schedule);
      resize.disconnect();
    };
  }, [readerRef, titleRef, documentId, locationKey]);
  return visible;
}
