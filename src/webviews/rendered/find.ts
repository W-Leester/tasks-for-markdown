/**
 * Find in the rendered view (11-01): `Cmd/Ctrl+F` opens a small bar; matches are highlighted (CSS Custom Highlight
 * API), `Enter`/`Shift+Enter` go to the next/previous one, `Esc` closes. VS Code's own find widget for webviews did not
 * search the view in Cursor, so the view does it itself.
 */

interface FindBar {
  /** Open (or focus) the bar, with the current selection as the term when there is one. */
  open(): void;
  /** Search again after the note re-rendered, staying near the same match. */
  refresh(): void;
}

type HighlightRegistry = { set(name: string, h: unknown): void; delete(name: string): void };
const highlights = (): HighlightRegistry | null => ((globalThis as unknown as { CSS?: { highlights?: HighlightRegistry } }).CSS?.highlights ?? null);
const HighlightCtor = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;

export function createFindBar(root: HTMLElement): FindBar {
  let bar: HTMLDivElement | null = null;
  let input: HTMLInputElement;
  let count: HTMLSpanElement;
  let matches: Range[] = [];
  let current = -1;

  const clear = () => {
    highlights()?.delete('rv-find');
    highlights()?.delete('rv-find-current');
  };

  const search = (keepIndex: boolean) => {
    const term = input.value;
    matches = [];
    if (term) {
      const needle = term.toLocaleLowerCase();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const el = n.parentElement;
          if (!el || el.closest('textarea, script, style, .rv-find')) return NodeFilter.FILTER_REJECT;
          // Rows the Show filter hides are not matches.
          const visible = (el as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility?.() ?? true;
          return visible ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const hay = (n.nodeValue ?? '').toLocaleLowerCase();
        for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) {
          const r = document.createRange();
          r.setStart(n, i);
          r.setEnd(n, i + needle.length);
          matches.push(r);
        }
      }
    }
    current = matches.length ? (keepIndex ? Math.min(Math.max(current, 0), matches.length - 1) : 0) : -1;
    show(!keepIndex);
  };

  const show = (scroll: boolean) => {
    clear();
    const reg = highlights();
    if (reg && HighlightCtor && matches.length) {
      reg.set('rv-find', new HighlightCtor(...matches));
      reg.set('rv-find-current', new HighlightCtor(matches[current]!));
    }
    count.textContent = input.value ? (matches.length ? `${current + 1}/${matches.length}` : document.body.dataset.lFindNone ?? 'No results') : '';
    bar!.classList.toggle('rv-find-none', !!input.value && !matches.length);
    if (scroll && current >= 0) matches[current]!.startContainer.parentElement?.scrollIntoView({ block: 'center' });
  };

  const step = (by: number) => {
    if (!matches.length) return;
    current = (current + by + matches.length) % matches.length;
    show(true);
  };

  const close = () => {
    clear();
    bar?.remove();
    bar = null;
    matches = [];
  };

  const build = () => {
    bar = document.createElement('div');
    bar.className = 'rv-find';
    input = document.createElement('input');
    input.type = 'text';
    input.placeholder = document.body.dataset.lFind ?? 'Find';
    count = document.createElement('span');
    count.className = 'rv-find-count';
    const button = (label: string, title: string, act: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.addEventListener('mousedown', (e) => e.preventDefault()); // keep the focus in the input
      b.addEventListener('click', act);
      return b;
    };
    bar.append(input, count, button('↑', 'Shift+Enter', () => step(-1)), button('↓', 'Enter', () => step(1)), button('✕', 'Esc', close));
    input.addEventListener('input', () => search(false));
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // not the selected-row keys
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    document.body.appendChild(bar);
  };

  return {
    open() {
      const picked = window.getSelection()?.toString().trim() ?? '';
      if (!bar) build();
      if (picked && !picked.includes('\n')) { input.value = picked; search(false); }
      input.focus();
      input.select();
    },
    refresh() {
      if (bar && input.value) search(true);
    },
  };
}
