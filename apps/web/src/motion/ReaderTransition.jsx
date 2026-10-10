import React, {Component, createRef} from 'react';
import {MOTION} from './tokens.js';

let snapshotSequence = 0;

// Capture the outgoing DOM before React replaces it. Only the new reader is
// live; the temporary, inert image of the old reader preserves its scroll state.
export class ReaderTransition extends Component {
  host = createRef();
  content = createRef();
  incoming = null;
  outgoing = new Map();

  getSnapshotBeforeUpdate(previous) {
    if (previous.documentId === this.props.documentId || this.props.reduced) return null;
    const element = this.content.current;
    const style = getComputedStyle(element);
    const clone = element.cloneNode(true);
    clone.className = 'reader-transition-content reader-snapshot';
    clone.inert = true;
    clone.setAttribute('aria-hidden', 'true');
    const originals = [element, ...element.querySelectorAll('*')];
    const copies = [clone, ...clone.querySelectorAll('*')];
    const scrolls = [];
    const prefix = `reader-snapshot-${++snapshotSequence}`;
    const ids = new Map(copies.filter(copy => copy.id).map((copy, i) => [copy.id, `${prefix}-${i}`]));
    copies.forEach((copy, i) => {
      // Preserve SVG marker/gradient references without duplicate document IDs.
      for (const attribute of [...copy.attributes]) {
        let value = attribute.value.replace(/url\(["']?#([^)'" ]+)["']?\)/g,
          (match, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
        if (['href', 'xlink:href'].includes(attribute.name) && value.startsWith('#') && ids.has(value.slice(1))) value = `#${ids.get(value.slice(1))}`;
        if (value !== attribute.value) copy.setAttribute(attribute.name, value);
      }
      if (copy.id) copy.id = ids.get(copy.id);
      copy.removeAttribute('data-document-id');
      if (originals[i].scrollTop || originals[i].scrollLeft) {
        scrolls.push([copy, originals[i].scrollTop, originals[i].scrollLeft]);
      }
    });
    return {clone, scrolls, opacity: style.opacity, transform: style.transform};
  }

  componentDidUpdate(previous, _state, snapshot) {
    if (this.props.reduced) { this.clear(); return; }
    if (!snapshot) return;
    const {clone, scrolls, opacity, transform} = snapshot;
    this.incoming?.cancel();
    this.host.current.appendChild(clone);
    scrolls.forEach(([element, top, left]) => element.scrollTo({top, left, behavior: 'instant'}));
    const options = {duration: MOTION.enter, easing: MOTION.ease, fill: 'both'};
    const exit = clone.animate([
      {opacity, transform}, {opacity: 0, transform: 'translateX(-8px)'},
    ], options);
    this.outgoing.set(clone, exit);
    const remove = () => {clone.remove(); this.outgoing.delete(clone);};
    exit.finished.then(remove, remove);
    // Keep rapid navigation bounded without queueing stale documents.
    while (this.outgoing.size > 2) {
      const [old, animation] = this.outgoing.entries().next().value;
      animation.cancel(); old.remove(); this.outgoing.delete(old);
    }
    const enter = this.content.current.animate([
      {opacity: 0, transform: 'translateX(8px)'}, {opacity: 1, transform: 'none'},
    ], options);
    this.incoming = enter;
    enter.finished.then(() => {
      if (this.incoming === enter) {enter.cancel(); this.incoming = null;}
    }, () => {});
  }

  clear() {
    this.incoming?.cancel(); this.incoming = null;
    for (const [element, animation] of this.outgoing) {animation.cancel(); element.remove();}
    this.outgoing.clear();
  }

  componentWillUnmount() { this.clear(); }

  render() {
    return <div className="reader-transition-stack" ref={this.host}>
      <div className="reader-transition-content" ref={this.content}>{this.props.children}</div>
    </div>;
  }
}
