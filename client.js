/**
 * DeepSeek Harness client bundle for Conversation find.
 *
 * The module loader supplies React and react-dom as platform seeds. Everything
 * else is self-contained: the find bar is rendered through a body portal, and
 * search highlights use the CSS Custom Highlight API instead of mutating the
 * conversation DOM.
 */
window.__ModuleLoader__.load({
  id: 'dsh-find-in-conversation',
  factory(require) {
    const React = require('react');
    const { createPortal } = require('react-dom');
    const h = React.createElement;

    const SLOT = 'conversation.session.header.actions';
    const NS = 'dsh-find-in-conversation';
    const MAX_MATCHES = 5000;
    const PULSE_MS = 500;
    const WRAP_TOAST_MS = 1400;
    const SCAN_DEBOUNCE_MS = 140;
    const SEARCH_RETRY_MS = 100;
    const SEARCH_RETRY_LIMIT = 20;
    const VIEWPORT_MARGIN = 10;
    const SCROLL_SUPPRESS_MS = 120;
    const TOAST_OFFSET_Y = 64;
    const TOAST_TOP_INSET = 28;
    const ALL_HIGHLIGHT = 'dsh-fic-all';
    const ACTIVE_HIGHLIGHT = 'dsh-fic-active';
    const PULSE_HIGHLIGHT = 'dsh-fic-active-pulse';
    const IS_APPLE = (() => {
      try {
        return (
          /Mac|iPhone|iPad|iPod/.test(navigator.platform || '') ||
          /Mac OS X/.test(navigator.userAgent)
        );
      } catch {
        return false;
      }
    })();
    const OPEN_CHORD = IS_APPLE ? '⌘F' : 'Ctrl+F';
    const NEXT_CHORD = IS_APPLE ? '⌘G' : 'Ctrl+G';
    const PREV_CHORD = IS_APPLE ? '⇧⌘G' : 'Ctrl+Shift+G';

    // Client-side strings. The plugin metadata lives in locale/*.json.
    const DICTS = {
      en: {
        'search.placeholder': 'Search this conversation',
        'search.label': 'Search this conversation',
        'search.open': 'Search conversation',
        'search.previous': 'Previous match',
        'search.next': 'Next match',
        'search.matchCase': 'Match case',
        'search.highlightAll': 'Highlight all',
        'search.close': 'Close search',
        'search.count': '{current} of {total}',
        'search.wrappedToFirst': 'Looped to first match',
        'search.wrappedToLast': 'Looped to last match',
      },
      zh: {
        'search.placeholder': '在会话中查找',
        'search.label': '在会话中查找',
        'search.open': '在会话中查找',
        'search.previous': '上一项',
        'search.next': '下一项',
        'search.matchCase': '区分大小写',
        'search.highlightAll': '高亮全部',
        'search.close': '关闭查找',
        'search.count': '第 {current} 项，共 {total} 项',
        'search.wrappedToFirst': '已循环到第一项',
        'search.wrappedToLast': '已循环到末项',
      },
    };

    // All plugin styles are scoped under dsh-fic-* and removed with the plugin.
    const STYLE = `
.dsh-fic-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font: inherit;
}
.dsh-fic-trigger:hover,
.dsh-fic-trigger[aria-expanded="true"] {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dsh-fic-trigger:focus-visible,
.dsh-fic-bar button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.dsh-fic-bar {
  position: fixed;
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  flex-wrap: wrap;
  width: min(650px, calc(100vw - 24px));
  padding: 6px 7px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  box-shadow:
    0 10px 32px color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent),
    0 1px 3px color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);
  font: inherit;
  font-size: 13px;
  line-height: 1.35;
}
.dsh-fic-bar:focus-within {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, var(--dsw-alias-border-l1));
}
.dsh-fic-leading {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-fic-input {
  flex: 1 1 160px;
  min-width: 90px;
  height: 26px;
  padding: 0 4px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}
.dsh-fic-input::placeholder {
  color: var(--dsw-alias-label-secondary);
}
.dsh-fic-count {
  flex: none;
  min-width: 96px;
  padding: 0 2px;
  text-align: right;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dsh-fic-count[data-empty="true"] {
  opacity: .72;
}
.dsh-fic-nav,
.dsh-fic-options {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 1px;
}
.dsh-fic-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font: inherit;
}
.dsh-fic-icon-button:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dsh-fic-icon-button:disabled {
  opacity: .35;
  cursor: default;
}
.dsh-fic-divider {
  flex: none;
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: var(--dsw-alias-border-l1);
}
.dsh-fic-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
}
.dsh-fic-toggle:hover {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dsh-fic-toggle[aria-pressed="true"] {
  border-color: var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dsh-fic-check {
  display: inline-block;
  width: 9px;
  overflow: hidden;
  font-size: 11px;
  line-height: 1;
  text-align: center;
  visibility: hidden;
}
.dsh-fic-toggle[aria-pressed="true"] .dsh-fic-check {
  visibility: visible;
}
.dsh-fic-wrap-toast {
  position: fixed;
  z-index: 950;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 32px);
  padding: 9px 16px;
  border-radius: 999px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent);
  font: inherit;
  font-size: 13px;
  line-height: 1.35;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation:
    dsh-fic-wrap-toast-in 160ms ease-out,
    dsh-fic-wrap-toast-out 200ms ease-in 1200ms forwards;
}
.dsh-fic-wrap-icon {
  color: inherit;
  font-size: 15px;
  line-height: 1;
}
@keyframes dsh-fic-wrap-toast-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(.94);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
@keyframes dsh-fic-wrap-toast-out {
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(.97);
  }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-fic-wrap-toast,
  .dsh-fic-pulse-ring {
    animation: none;
  }
  .dsh-fic-pulse-ring {
    display: none;
  }
}
.dsh-fic-pulse-ring {
  position: fixed;
  z-index: 940;
  box-sizing: border-box;
  border: 2px solid #FFFB00;
  border-radius: 5px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, .35),
    0 0 16px rgba(255, 251, 0, .55);
  pointer-events: none;
  transform-origin: center;
  animation: dsh-fic-pulse-ring ${PULSE_MS}ms cubic-bezier(.2, .8, .2, 1) forwards;
}
@keyframes dsh-fic-pulse-ring {
  0% {
    opacity: 0;
    transform: scale(.96);
  }
  20% {
    opacity: 1;
  }
  55% {
    opacity: 1;
    transform: scale(1.08);
  }
  100% {
    opacity: 0;
    transform: scale(1.02);
  }
}
::highlight(dsh-fic-all) {
  background-color: #FFFB00;
  color: #000;
}
::highlight(dsh-fic-active-pulse) {
  background-color: #FFFB00;
  color: #000;
}
::highlight(dsh-fic-active) {
  background-color: #B4D8FD;
  color: #000;
}
@media (max-width: 720px) {
  .dsh-fic-bar {
    flex-wrap: wrap;
    width: calc(100vw - 16px);
  }
  .dsh-fic-count {
    min-width: 0;
  }
}
`;

    // Text indexing and geometry helpers.
    function escapeRegExp(value) {
      return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function sessionRoot(sessionId) {
      if (typeof document === 'undefined') return undefined;
      const nodes = document.querySelectorAll('[data-conversation-session]');
      let best;
      let bestArea = -1;
      for (const node of nodes) {
        if (
          !(node instanceof HTMLElement) ||
          node.getAttribute('data-conversation-session') !== sessionId
        )
          continue;
        const rect = node.getBoundingClientRect();
        const area = Math.max(0, rect.width) * Math.max(0, rect.height);
        if (area > bestArea) {
          best = node;
          bestArea = area;
        }
      }
      return best;
    }

    function isActiveConversation(sessionId) {
      if (typeof document === 'undefined') return false;
      const roots = [...document.querySelectorAll('[data-conversation-session]')].filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const matching = roots.filter(
        (node) => node.getAttribute('data-conversation-session') === sessionId,
      );
      if (matching.length === 0) return false;
      if (roots.length === 1) return true;
      const active = document.activeElement;
      const focusedRoot =
        active && typeof active.closest === 'function'
          ? active.closest('[data-conversation-session]')
          : null;
      if (focusedRoot) return focusedRoot.getAttribute('data-conversation-session') === sessionId;
      let best;
      let bestArea = -1;
      for (const node of roots) {
        const rect = node.getBoundingClientRect();
        const area = Math.max(0, rect.width) * Math.max(0, rect.height);
        if (area > bestArea) {
          best = node;
          bestArea = area;
        }
      }
      return best !== undefined && best.getAttribute('data-conversation-session') === sessionId;
    }

    function shouldHandleFindShortcut(sessionId, open) {
      if (open) return true;
      if (typeof document === 'undefined') return false;
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) {
        return isActiveConversation(sessionId);
      }
      if (!(active instanceof Element)) return false;
      if (active.closest('.dsh-fic-trigger') !== null) return true;
      const focusedRoot = active.closest('[data-conversation-session]');
      return (
        focusedRoot !== null && focusedRoot.getAttribute('data-conversation-session') === sessionId
      );
    }

    function nearestBlock(element, root, cache) {
      let current = element;
      while (current && current !== root) {
        const cached = cache.get(current);
        if (cached !== undefined) return cached;
        const display = getComputedStyle(current).display;
        if (
          display &&
          display !== 'contents' &&
          display !== 'none' &&
          !display.startsWith('inline')
        ) {
          cache.set(element, current);
          return current;
        }
        current = current.parentElement;
      }
      cache.set(element, root);
      return root;
    }

    function segmentAt(segments, offset) {
      let low = 0;
      let high = segments.length - 1;
      while (low <= high) {
        const middle = (low + high) >> 1;
        const segment = segments[middle];
        if (offset < segment.start) high = middle - 1;
        else if (offset >= segment.end) low = middle + 1;
        else return segment;
      }
      return undefined;
    }

    function findRanges(root, query, matchCase) {
      if (!root || !query || !query.trim()) return { ranges: [], truncated: false };
      const segments = [];
      const blockCache = new WeakMap();
      let text = '';
      let lastBlock;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const value = node.nodeValue;
          if (!value || !value.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (
            parent.closest(
              '[data-conversation-region="composer"], script, style, noscript, [hidden], [aria-hidden="true"]',
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          if (typeof parent.checkVisibility === 'function') {
            if (
              !parent.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: false })
            ) {
              return NodeFilter.FILTER_REJECT;
            }
          } else {
            const style = getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return NodeFilter.FILTER_REJECT;
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      let node;
      while ((node = walker.nextNode())) {
        const block = nearestBlock(node.parentElement, root, blockCache);
        if (text.length > 0 && block !== lastBlock) text += '\n';
        const start = text.length;
        text += node.nodeValue;
        segments.push({ node, start, end: text.length, block });
        lastBlock = block;
      }

      if (!text || segments.length === 0) return { ranges: [], truncated: false };

      let pattern;
      try {
        pattern = new RegExp(escapeRegExp(query), matchCase ? 'gu' : 'giu');
      } catch {
        pattern = new RegExp(escapeRegExp(query), matchCase ? 'g' : 'gi');
      }

      const ranges = [];
      let truncated = false;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[0];
        if (value.length === 0) {
          pattern.lastIndex += 1;
          continue;
        }
        const start = match.index;
        const end = start + value.length;
        const startSegment = segmentAt(segments, start);
        const endSegment = segmentAt(segments, end - 1);
        if (!startSegment || !endSegment || startSegment.block !== endSegment.block) continue;
        const range = document.createRange();
        range.setStart(startSegment.node, start - startSegment.start);
        range.setEnd(endSegment.node, end - endSegment.start);
        ranges.push(range);
        if (ranges.length >= MAX_MATCHES) {
          truncated = true;
          break;
        }
      }
      return { ranges, truncated };
    }

    // CSS Custom Highlight API: paint matches without touching conversation DOM.
    function clearHighlights() {
      if (typeof CSS === 'undefined' || !CSS.highlights) return;
      CSS.highlights.delete(ALL_HIGHLIGHT);
      CSS.highlights.delete(ACTIVE_HIGHLIGHT);
      CSS.highlights.delete(PULSE_HIGHLIGHT);
    }

    function applyHighlights(ranges, activeIndex, highlightAll, pulseActive) {
      if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return;
      clearHighlights();
      if (ranges.length === 0) return;

      if (highlightAll) {
        const all = new Highlight();
        for (let index = 0; index < ranges.length; index += 1) {
          if (index !== activeIndex) all.add(ranges[index]);
        }
        if (all.size > 0) {
          try {
            all.priority = 0;
          } catch {}
          CSS.highlights.set(ALL_HIGHLIGHT, all);
        }
      }

      const active = ranges[activeIndex];
      if (active) {
        const only = new Highlight(active);
        try {
          only.priority = 1;
        } catch {}
        CSS.highlights.set(pulseActive ? PULSE_HIGHLIGHT : ACTIVE_HIGHLIGHT, only);
      }
    }

    function conversationScroller(root) {
      const scroller = root.querySelector('[data-conversation-scroll]');
      return scroller instanceof HTMLElement ? scroller : root;
    }

    function conversationViewport(root) {
      const scroller = conversationScroller(root);
      const box = scroller.getBoundingClientRect();
      let bottom = box.bottom;
      const composer = root.querySelector('[data-conversation-region="composer"]');
      if (composer instanceof HTMLElement) {
        const composerBox = composer.getBoundingClientRect();
        if (composerBox.height > 0 && composerBox.top > box.top && composerBox.top < bottom) {
          bottom = composerBox.top;
        }
      }
      return { top: box.top, bottom };
    }

    function rangeRect(range) {
      if (!range) return undefined;
      try {
        return range.getBoundingClientRect();
      } catch {
        return undefined;
      }
    }

    function rangeLineRects(range) {
      if (!range) return [];
      let rects;
      try {
        rects = range.getClientRects();
      } catch {
        return [];
      }
      const lines = new Map();
      for (const rect of rects) {
        if (!rect || rect.width <= 0 || rect.height <= 0) continue;
        const key = Math.round(rect.top);
        const line = lines.get(key);
        if (line === undefined) {
          lines.set(key, {
            left: rect.left,
            top: rect.top,
            right: rect.left + rect.width,
            bottom: rect.top + rect.height,
          });
        } else {
          line.left = Math.min(line.left, rect.left);
          line.top = Math.min(line.top, rect.top);
          line.right = Math.max(line.right, rect.left + rect.width);
          line.bottom = Math.max(line.bottom, rect.top + rect.height);
        }
      }
      if (lines.size > 0) {
        return [...lines.values()].map((line) => ({
          left: Math.round(line.left),
          top: Math.round(line.top),
          width: Math.max(1, Math.round(line.right - line.left)),
          height: Math.max(1, Math.round(line.bottom - line.top)),
        }));
      }
      const fallback = rangeRect(range);
      if (!fallback || (fallback.width === 0 && fallback.height === 0)) return [];
      return [
        {
          left: Math.round(fallback.left),
          top: Math.round(fallback.top),
          width: Math.max(1, Math.round(fallback.width)),
          height: Math.max(1, Math.round(fallback.height)),
        },
      ];
    }

    function findAnchorIndex(ranges, root) {
      if (ranges.length === 0) return 0;
      const viewport = conversationViewport(root);
      let firstStarting;
      let firstIntersecting;
      let lastAbove;
      for (let index = 0; index < ranges.length; index += 1) {
        const rect = rangeRect(ranges[index]);
        if (!rect || (rect.width === 0 && rect.height === 0)) continue;
        if (rect.top >= viewport.top && rect.bottom <= viewport.bottom) return index;
        if (firstStarting === undefined && rect.top >= viewport.top) firstStarting = index;
        if (
          firstIntersecting === undefined &&
          rect.bottom > viewport.top &&
          rect.top < viewport.bottom
        ) {
          firstIntersecting = index;
        }
        if (rect.bottom <= viewport.top) lastAbove = index;
      }
      if (firstStarting !== undefined) return firstStarting;
      if (firstIntersecting !== undefined) return firstIntersecting;
      return lastAbove ?? 0;
    }

    function isRangeVisible(range, root) {
      const rect = rangeRect(range);
      if (!rect || (rect.width === 0 && rect.height === 0)) return false;
      const viewport = conversationViewport(root);
      return rect.top >= viewport.top && rect.bottom <= viewport.bottom;
    }

    function scrollToRange(range, root) {
      if (!range) return;
      const container = range.startContainer;
      const element =
        container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
      if (!element || !element.isConnected) return;

      if (!root) {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
        return;
      }

      const before = rangeRect(range);
      const viewport = conversationViewport(root);
      const measurable = before && (before.width !== 0 || before.height !== 0);
      if (measurable) {
        const fullyVisible = before.top >= viewport.top && before.bottom <= viewport.bottom;
        if (fullyVisible) return;
        const intersects = before.bottom > viewport.top && before.top < viewport.bottom;
        if (!intersects) {
          // A different screen: center the match instead of only revealing its edge.
          element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
          const rect = rangeRect(range);
          if (!rect) return;
          const nextViewport = conversationViewport(root);
          const delta = rect.top + rect.height / 2 - (nextViewport.top + nextViewport.bottom) / 2;
          if (delta === 0) return;
          const scroller = conversationScroller(root);
          if (typeof scroller.scrollBy === 'function') {
            scroller.scrollBy({ top: delta, behavior: 'auto' });
          } else {
            scroller.scrollTop += delta;
          }
          return;
        }
      }

      // Still on the same screen: reveal the remaining edge with minimal movement.
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      if (!measurable) return;
      const rect = rangeRect(range);
      if (!rect) return;
      const nextViewport = conversationViewport(root);
      const margin = VIEWPORT_MARGIN;
      let delta = 0;
      if (rect.top < nextViewport.top + margin) delta = rect.top - (nextViewport.top + margin);
      else if (rect.bottom > nextViewport.bottom - margin)
        delta = rect.bottom - (nextViewport.bottom - margin);
      if (delta === 0) return;
      const scroller = conversationScroller(root);
      if (typeof scroller.scrollBy === 'function') {
        scroller.scrollBy({ top: delta, behavior: 'auto' });
      } else {
        scroller.scrollTop += delta;
      }
    }

    // React hooks for viewport-aware positioning and locale refresh.
    function useBarPosition(open, sessionId) {
      const [position, setPosition] = React.useState({ top: 72, right: 24, width: 650 });
      React.useLayoutEffect(() => {
        if (!open) return undefined;
        let frame = 0;
        const update = () => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const root = sessionRoot(sessionId);
            if (!root) return;
            const rect = root.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            setPosition({
              top: Math.max(8, Math.round(rect.top + 10)),
              right: Math.max(8, Math.round(window.innerWidth - rect.right + 12)),
              width: Math.max(240, Math.min(650, Math.round(rect.width - 24))),
            });
          });
        };
        update();
        window.addEventListener('resize', update);
        let observer;
        const root = sessionRoot(sessionId);
        if (root && typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(update);
          observer.observe(root);
        }
        return () => {
          cancelAnimationFrame(frame);
          window.removeEventListener('resize', update);
          if (observer) observer.disconnect();
        };
      }, [open, sessionId]);
      return position;
    }

    function useLocale(ctx) {
      const [, setRevision] = React.useState(0);
      React.useEffect(
        () => ctx.locale.subscribe(() => setRevision((revision) => revision + 1)),
        [ctx],
      );
      return ctx.locale.bind(NS);
    }

    // Inline SVG icons.
    function searchIcon() {
      return h(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 20 20', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 8.5, cy: 8.5, r: 5.25, stroke: 'currentColor', strokeWidth: 1.7 }),
        h('path', {
          d: 'M12.5 12.5 16 16',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
        }),
      );
    }

    function chevronIcon(direction) {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: direction === 'up' ? 'M4 10 8 6l4 4' : 'M4 6l4 4 4-4',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    function closeIcon() {
      return h(
        'svg',
        { width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'm4 4 8 8M12 4l-8 8',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
        }),
      );
    }

    // The find bar itself. The component owns all transient UI state.
    function createFindAction(ctx) {
      return function FindAction({ sessionId }) {
        const t = useLocale(ctx);
        const [open, setOpen] = React.useState(false);
        const [query, setQuery] = React.useState('');
        const [composing, setComposing] = React.useState(false);
        const [matchCase, setMatchCase] = React.useState(false);
        const [highlightAll, setHighlightAll] = React.useState(true);
        const [ranges, setRanges] = React.useState([]);
        const [activeIndex, setActiveIndex] = React.useState(0);
        const [truncated, setTruncated] = React.useState(false);
        const [scrollTick, setScrollTick] = React.useState(0);
        const [wrapNotice, setWrapNotice] = React.useState(null);
        const [wrapRevision, setWrapRevision] = React.useState(0);
        const [toastPosition, setToastPosition] = React.useState(null);
        const [pulse, setPulse] = React.useState(null);
        const [pulseTick, setPulseTick] = React.useState(0);
        const [pulseHighlight, setPulseHighlight] = React.useState(false);

        const inputRef = React.useRef(null);
        const previousFocusRef = React.useRef(null);
        const pendingScrollRef = React.useRef(false);
        const composingRef = React.useRef(false);
        const viewportDirtyRef = React.useRef(false);
        const suppressScrollUntilRef = React.useRef(0);
        const wrapTimerRef = React.useRef(0);
        const pulseTimerRef = React.useRef(0);
        const rangesRef = React.useRef(ranges);
        const activeRef = React.useRef(activeIndex);
        const openRef = React.useRef(open);
        rangesRef.current = ranges;
        activeRef.current = activeIndex;
        openRef.current = open;
        composingRef.current = composing;

        const position = useBarPosition(open, sessionId);

        const clearPulse = React.useCallback(() => {
          if (pulseTimerRef.current !== 0) {
            clearTimeout(pulseTimerRef.current);
            pulseTimerRef.current = 0;
          }
          setPulse(null);
          setPulseHighlight(false);
        }, []);

        React.useLayoutEffect(() => {
          if (!wrapNotice) {
            setToastPosition(null);
            return undefined;
          }
          const update = () => {
            const root = sessionRoot(sessionId);
            if (!root) return;
            const box = root.getBoundingClientRect();
            const viewport = conversationViewport(root);
            if (box.width <= 0 || viewport.bottom <= viewport.top) return;
            const centerY = (viewport.top + viewport.bottom) / 2;
            setToastPosition({
              left: Math.round(box.left + box.width / 2),
              // Keep the transient toast clear of a page-turn match centered below it.
              top: Math.max(
                Math.round(viewport.top + TOAST_TOP_INSET),
                Math.round(centerY - TOAST_OFFSET_Y),
              ),
            });
          };
          update();
          window.addEventListener('resize', update);
          let observer;
          const root = sessionRoot(sessionId);
          if (root && typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(update);
            observer.observe(root);
          }
          return () => {
            window.removeEventListener('resize', update);
            if (observer) observer.disconnect();
          };
        }, [wrapNotice, wrapRevision, sessionId]);

        React.useEffect(() => {
          if (!open) {
            pendingScrollRef.current = false;
            setRanges([]);
            setActiveIndex(0);
            setTruncated(false);
            return undefined;
          }
          if (composing || composingRef.current) {
            pendingScrollRef.current = false;
            clearHighlights();
            clearPulse();
            setRanges([]);
            setActiveIndex(0);
            setTruncated(false);
            return undefined;
          }
          if (!query || !query.trim()) {
            pendingScrollRef.current = false;
            setRanges([]);
            setActiveIndex(0);
            setTruncated(false);
            return undefined;
          }

          let disposed = false;
          let timer;
          let observer;
          let retryTimer;
          let attempts = 0;

          const scan = (reset) => {
            if (disposed) return;
            const root = sessionRoot(sessionId);
            if (!root) return;
            const result = findRanges(root, query, matchCase);
            setRanges(result.ranges);
            setTruncated(result.truncated);
            if (reset) {
              const anchor = findAnchorIndex(result.ranges, root);
              setActiveIndex(anchor);
              pendingScrollRef.current =
                result.ranges.length > 0 && !isRangeVisible(result.ranges[anchor], root);
              viewportDirtyRef.current = false;
              if (result.ranges.length > 0) {
                setPulseHighlight(true);
                setPulseTick((tick) => tick + 1);
              } else {
                clearPulse();
              }
            } else {
              setActiveIndex((current) => {
                return result.ranges.length === 0 ? 0 : Math.min(current, result.ranges.length - 1);
              });
            }
          };

          const observe = (root) => {
            observer = new MutationObserver(() => {
              clearTimeout(timer);
              timer = setTimeout(() => scan(false), SCAN_DEBOUNCE_MS);
            });
            observer.observe(root, {
              subtree: true,
              childList: true,
              characterData: true,
              attributes: true,
              attributeFilter: ['class', 'style', 'open', 'hidden', 'aria-hidden'],
            });
          };

          const attach = () => {
            if (disposed) return;
            const root = sessionRoot(sessionId);
            if (root) {
              scan(true);
              observe(root);
              return;
            }
            attempts += 1;
            if (attempts < SEARCH_RETRY_LIMIT) retryTimer = setTimeout(attach, SEARCH_RETRY_MS);
          };

          attach();
          return () => {
            disposed = true;
            clearTimeout(timer);
            clearTimeout(retryTimer);
            if (observer) observer.disconnect();
          };
        }, [open, composing, query, matchCase, sessionId, clearPulse]);

        // A manual transcript scroll is a new reading position. Re-anchor on the
        // next navigation; programmatic find scrolling is briefly suppressed.
        React.useEffect(() => {
          if (!open) {
            viewportDirtyRef.current = false;
            return undefined;
          }
          const onScroll = (event) => {
            if (performance.now() < suppressScrollUntilRef.current) return;
            const target = event.target;
            if (!(target instanceof HTMLElement) || !target.matches('[data-conversation-scroll]')) {
              return;
            }
            const root = target.closest('[data-conversation-session]');
            if (!root || root.getAttribute('data-conversation-session') !== sessionId) return;
            viewportDirtyRef.current = true;
          };
          document.addEventListener('scroll', onScroll, true);
          return () => document.removeEventListener('scroll', onScroll, true);
        }, [open, sessionId]);

        React.useLayoutEffect(() => {
          if (!open) {
            clearHighlights();
            return undefined;
          }
          applyHighlights(ranges, activeIndex, highlightAll, pulseHighlight);
          return clearHighlights;
        }, [open, ranges, activeIndex, highlightAll, pulseHighlight]);

        React.useEffect(() => {
          if (!open || !pendingScrollRef.current) return;
          pendingScrollRef.current = false;
          const root = sessionRoot(sessionId);
          if (root) {
            const range = ranges[activeIndex];
            if (range && !isRangeVisible(range, root)) {
              suppressScrollUntilRef.current = performance.now() + SCROLL_SUPPRESS_MS;
            }
            scrollToRange(range, root);
          }
        }, [open, ranges, activeIndex, scrollTick, sessionId]);

        React.useEffect(() => {
          if (!open || pulseTick === 0) return;
          const range = ranges[activeIndex];
          if (!range) {
            setPulseHighlight(false);
            return;
          }
          const rects = rangeLineRects(range);
          if (rects.length === 0) {
            setPulseHighlight(false);
            return;
          }
          setPulse({ key: pulseTick, rects });
          setPulseHighlight(true);
          if (pulseTimerRef.current !== 0) clearTimeout(pulseTimerRef.current);
          pulseTimerRef.current = window.setTimeout(() => {
            pulseTimerRef.current = 0;
            setPulseHighlight(false);
            setPulse(null);
          }, PULSE_MS);
        }, [pulseTick]);

        const focusInput = React.useCallback((attempt = 0) => {
          const input = inputRef.current;
          if (input) {
            input.focus();
            input.select();
            return;
          }
          if (attempt < 5) requestAnimationFrame(() => focusInput(attempt + 1));
        }, []);

        const openBar = React.useCallback(() => {
          if (!openRef.current) previousFocusRef.current = document.activeElement;
          viewportDirtyRef.current = false;
          suppressScrollUntilRef.current = 0;
          setOpen(true);
          requestAnimationFrame(() => focusInput());
        }, [focusInput]);

        const clearWrapNotice = React.useCallback(() => {
          if (wrapTimerRef.current !== 0) {
            clearTimeout(wrapTimerRef.current);
            wrapTimerRef.current = 0;
          }
          setWrapNotice(null);
        }, []);

        const showWrapNotice = React.useCallback((kind) => {
          if (wrapTimerRef.current !== 0) clearTimeout(wrapTimerRef.current);
          setWrapNotice(kind);
          setWrapRevision((revision) => revision + 1);
          wrapTimerRef.current = window.setTimeout(() => {
            wrapTimerRef.current = 0;
            setWrapNotice(null);
          }, WRAP_TOAST_MS);
        }, []);

        React.useEffect(
          () => () => {
            if (wrapTimerRef.current !== 0) {
              clearTimeout(wrapTimerRef.current);
              wrapTimerRef.current = 0;
            }
          },
          [],
        );

        React.useEffect(
          () => () => {
            clearPulse();
          },
          [clearPulse],
        );

        React.useEffect(() => {
          clearWrapNotice();
        }, [query, matchCase, clearWrapNotice]);

        const close = React.useCallback(() => {
          clearWrapNotice();
          clearPulse();
          setOpen(false);
          pendingScrollRef.current = false;
          viewportDirtyRef.current = false;
          suppressScrollUntilRef.current = 0;
          setRanges([]);
          setActiveIndex(0);
          setTruncated(false);
          const previous = previousFocusRef.current;
          previousFocusRef.current = null;
          requestAnimationFrame(() => {
            if (previous && previous.isConnected && typeof previous.focus === 'function')
              previous.focus();
          });
        }, [clearWrapNotice, clearPulse]);

        const navigate = React.useCallback(
          (delta) => {
            const list = rangesRef.current;
            if (list.length === 0) return;

            // If the user scrolled after the last selection, start from the
            // current viewport instead of the stale active index.
            let current = activeRef.current;
            let jumped = false;
            if (viewportDirtyRef.current) {
              viewportDirtyRef.current = false;
              const root = sessionRoot(sessionId);
              if (root) {
                const anchor = findAnchorIndex(list, root);
                if (anchor !== current) {
                  current = anchor;
                  jumped = true;
                }
              }
            }

            const last = list.length - 1;
            const wrapped =
              !jumped &&
              list.length > 1 &&
              ((delta > 0 && current === last) || (delta < 0 && current === 0));
            const next = jumped ? current : (current + delta + list.length) % list.length;
            if (wrapped) showWrapNotice(delta > 0 ? 'first' : 'last');
            pendingScrollRef.current = true;
            setActiveIndex(next);
            setScrollTick((tick) => tick + 1);
            setPulseHighlight(true);
            setPulseTick((tick) => tick + 1);
          },
          [showWrapNotice, sessionId],
        );

        React.useEffect(() => {
          const onKeyDown = (event) => {
            if (event.isComposing || composingRef.current) return;
            const primary =
              !event.altKey &&
              (IS_APPLE ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey);
            const key = (event.key || '').toLowerCase();
            if (!primary) {
              if (
                open &&
                event.key === 'Escape' &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.altKey &&
                !event.shiftKey
              ) {
                event.preventDefault();
                event.stopImmediatePropagation();
                close();
              }
              return;
            }
            if (!event.shiftKey && (key === 'f' || event.code === 'KeyF')) {
              if (!shouldHandleFindShortcut(sessionId, open)) return;
              event.preventDefault();
              event.stopImmediatePropagation();
              openBar();
              return;
            }
            if (open && (key === 'g' || event.code === 'KeyG')) {
              event.preventDefault();
              event.stopImmediatePropagation();
              navigate(event.shiftKey ? -1 : 1);
            }
          };
          window.addEventListener('keydown', onKeyDown, true);
          return () => window.removeEventListener('keydown', onKeyDown, true);
        }, [open, openBar, close, navigate]);

        const matches = ranges.length;
        const current = matches === 0 ? 0 : activeIndex + 1;
        const total = truncated ? `${matches}+` : matches;
        const countText = composing || !query.trim() ? '—' : t('search.count', { current, total });

        const trigger = h(
          'button',
          {
            type: 'button',
            className: 'dsh-fic-trigger',
            title: `${t('search.open')} (${OPEN_CHORD})`,
            'aria-label': t('search.open'),
            'aria-expanded': open,
            onClick: () => (open ? close() : openBar()),
          },
          searchIcon(),
        );

        if (!open) return trigger;

        const bar = h(
          'div',
          {
            className: 'dsh-fic-bar',
            role: 'search',
            'aria-label': t('search.label'),
            style: {
              top: position.top,
              right: position.right,
              width: position.width,
              maxWidth: 'calc(100vw - 24px)',
            },
          },
          h('span', { className: 'dsh-fic-leading', 'aria-hidden': true }, searchIcon()),
          h('input', {
            ref: inputRef,
            className: 'dsh-fic-input',
            type: 'text',
            value: query,
            placeholder: t('search.placeholder'),
            'aria-label': t('search.label'),
            autoComplete: 'off',
            spellCheck: false,
            onChange: (event) => setQuery(event.target.value),
            onCompositionStart: () => {
              composingRef.current = true;
              clearHighlights();
              clearPulse();
              setComposing(true);
            },
            onCompositionEnd: (event) => {
              composingRef.current = false;
              setComposing(false);
              setQuery(event.currentTarget.value);
            },
            onKeyDown: (event) => {
              if (event.isComposing || composingRef.current) return;
              if (event.key === 'Enter') {
                event.preventDefault();
                navigate(event.shiftKey ? -1 : 1);
              }
            },
          }),
          h(
            'span',
            {
              className: 'dsh-fic-count',
              role: 'status',
              'aria-live': 'polite',
              'aria-atomic': 'true',
              'data-empty': matches === 0 ? 'true' : 'false',
            },
            countText,
          ),
          h(
            'span',
            { className: 'dsh-fic-nav' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-fic-icon-button',
                title: `${t('search.previous')} (${PREV_CHORD})`,
                'aria-label': t('search.previous'),
                disabled: matches === 0,
                onClick: () => navigate(-1),
              },
              chevronIcon('up'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-fic-icon-button',
                title: `${t('search.next')} (${NEXT_CHORD})`,
                'aria-label': t('search.next'),
                disabled: matches === 0,
                onClick: () => navigate(1),
              },
              chevronIcon('down'),
            ),
          ),
          h('span', { className: 'dsh-fic-divider', 'aria-hidden': true }),
          h(
            'span',
            { className: 'dsh-fic-options' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-fic-toggle',
                'aria-pressed': highlightAll,
                'aria-label': t('search.highlightAll'),
                title: t('search.highlightAll'),
                onClick: () => setHighlightAll((value) => !value),
              },
              h('span', { className: 'dsh-fic-check', 'aria-hidden': true }, '✓'),
              t('search.highlightAll'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-fic-toggle',
                'aria-pressed': matchCase,
                'aria-label': t('search.matchCase'),
                title: t('search.matchCase'),
                onClick: () => setMatchCase((value) => !value),
              },
              h('span', { className: 'dsh-fic-check', 'aria-hidden': true }, '✓'),
              t('search.matchCase'),
            ),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-fic-icon-button',
              title: t('search.close'),
              'aria-label': t('search.close'),
              onClick: close,
            },
            closeIcon(),
          ),
        );

        const toast =
          wrapNotice && toastPosition
            ? h(
                'div',
                {
                  key: `${wrapNotice}-${wrapRevision}`,
                  className: 'dsh-fic-wrap-toast',
                  role: 'status',
                  'aria-live': 'polite',
                  'aria-atomic': 'true',
                  style: { left: toastPosition.left, top: toastPosition.top },
                },
                h('span', { className: 'dsh-fic-wrap-icon', 'aria-hidden': true }, '↺'),
                t(wrapNotice === 'first' ? 'search.wrappedToFirst' : 'search.wrappedToLast'),
              )
            : null;

        const pulseRings = pulse
          ? pulse.rects.map((rect, index) =>
              h('div', {
                key: `${pulse.key}-${index}`,
                className: 'dsh-fic-pulse-ring',
                'aria-hidden': 'true',
                style: {
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                },
              }),
            )
          : null;

        return h(
          React.Fragment,
          null,
          trigger,
          createPortal(h(React.Fragment, null, bar, toast, pulseRings), document.body),
        );
      };
    }

    // Plugin lifecycle: locale registration, slot registration, style cleanup.
    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.plugin = 'dsh-find-in-conversation';
        style.textContent = STYLE;
        document.head.append(style);
        return () => style.remove();
      }, 'conversation find styles');

      ctx.effect(function* () {
        yield ctx.locale.register(NS, DICTS);
        yield ctx.slots.inject(SLOT, () =>
          ctx.slots.register(
            {
              name: SLOT,
              id: 'dsh-find-in-conversation',
              order: 30,
            },
            createFindAction(ctx),
          ),
        );
      }, 'conversation find');
    }

    return {
      inject: ['slots', 'locale'],
      apply,
    };
  },
});
