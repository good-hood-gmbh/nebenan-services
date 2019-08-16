import { createPath } from 'history';
import { scroll } from 'nebenan-helpers/lib/dom';
import eventproxy from 'nebenan-helpers/lib/eventproxy';

const ATTEMPTS_RATE = 300;
const PROXIMITY = 100;
const MAX_ATTEMPTS = 10;

export default (history, node) => {
  const stateHistory = {};
  const nodeScroll = scroll(node);

  let key = null;
  let tid = null;

  const stopAutoScroll = () => {
    if (tid) clearTimeout(tid);
    node.document.removeEventListener('touchmove', stopAutoScroll);
    node.document.removeEventListener('mousewheel', stopAutoScroll);
    node.document.removeEventListener('wheel', stopAutoScroll);
  };

  const ensurePosition = (targetPosition = 0) => {
    let iterations = 0;
    node.document.addEventListener('touchmove', stopAutoScroll);
    node.document.addEventListener('mousewheel', stopAutoScroll);
    node.document.addEventListener('wheel', stopAutoScroll);

    const scroller = () => {
      iterations += 1;
      const currentPosition = nodeScroll.get();

      // allow for small deviations
      if (Math.abs(currentPosition - targetPosition) < PROXIMITY) return stopAutoScroll();

      // prevent from scrolling endlessly
      if (iterations > MAX_ATTEMPTS) return stopAutoScroll();

      nodeScroll.to(targetPosition);
      tid = setTimeout(scroller, ATTEMPTS_RATE);
    };

    if (tid) clearTimeout(tid);
    scroller();
  };

  const save = () => {
    stateHistory[key] = nodeScroll.get();
  };

  const restore = (location) => {
    // update key for the next transition
    key = createPath(location);

    // try and restore scroll position for this route, or reset to top
    ensurePosition(stateHistory[key]);
  };

  const startProcessing = () => {
    // Attempts to store current scroll position
    const unsubscribeScroll = eventproxy('scroll', save);
    const unsubscribeHook = history.listen(restore);
    restore(history.location);

    return () => {
      unsubscribeScroll();
      unsubscribeHook();
    };
  };

  return { startProcessing, stateHistory };
};
