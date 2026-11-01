/**
 * Notes under a task in the rendered and live views (11-01): `💬 N` on a query row folds or shows its notes (shown by
 * default, a folded row stays folded when the results are drawn again), and each note has ✎ (edit in place) and ✕
 * (delete) on hover — on query rows (`li.tfm-qnote`) and, in the rendered view, on note lines in the note
 * (`li.tfm-note`).
 */

/** A note changed: `text` null deletes it. `path` null: a task in this note. */
export interface NoteEdit { path: string | null; line: number; index: number; text: string | null }

const folded = new Set<string>();
const rowKey = (li: HTMLElement) => `${li.dataset.tfmPath ?? ''}:${li.dataset.tfmLine ?? ''}`;

/** The task row a note belongs to, and the note's place and text. */
function noteRef(note: HTMLElement): { row: HTMLElement; path: string | null; line: number; index: number; text: string } | null {
  const row = note.parentElement?.closest<HTMLElement>('li.tfm-task');
  if (!row || row.dataset.tfmLine === undefined || note.dataset.tfmNote === undefined) return null;
  return { row, path: row.dataset.tfmPath ?? null, line: Number(row.dataset.tfmLine), index: Number(note.dataset.tfmNote), text: note.dataset.tfmNoteText ?? note.textContent ?? '' };
}

/** After drawing: ✎ ✕ on each note, and rows folded before stay folded. */
export function decorateNotes(root: ParentNode, labels: { edit: string; remove: string }): void {
  for (const row of Array.from(root.querySelectorAll<HTMLElement>('li.tfm-task'))) if (folded.has(rowKey(row))) row.classList.add('tfm-notes-folded');
  for (const note of Array.from(root.querySelectorAll<HTMLElement>('li.tfm-qnote, li.tfm-note'))) {
    if (note.dataset.tfmNote === undefined || note.querySelector(':scope > .rv-note-actions')) continue;
    const span = document.createElement('span');
    span.className = 'rv-note-actions';
    for (const [act, icon, title] of [['edit', '✎', labels.edit], ['delete', '✕', labels.remove]] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.noteAct = act;
      b.textContent = icon;
      b.title = title;
      b.setAttribute('aria-label', title);
      span.appendChild(b);
    }
    // After the note's own text, before anything nested under it.
    const nested = note.querySelector(':scope > ul, :scope > ol');
    if (nested) note.insertBefore(span, nested);
    else note.appendChild(span);
  }
}

/** Clicks on `💬 N` and on ✎ ✕, anywhere under `root`. Returns true when the event was a note's. */
export function handleNoteClick(e: MouseEvent, save: (edit: NoteEdit) => void): boolean {
  const target = e.target as Element;
  const chip = target.closest<HTMLElement>('.tfm-notes');
  const row = chip?.closest<HTMLElement>('li.tfm-task');
  if (chip && row) {
    e.preventDefault();
    row.classList.toggle('tfm-notes-folded');
    if (row.classList.contains('tfm-notes-folded')) folded.add(rowKey(row));
    else folded.delete(rowKey(row));
    return true;
  }
  const button = target.closest<HTMLButtonElement>('.rv-note-actions button');
  const note = button?.closest<HTMLElement>('li.tfm-qnote, li.tfm-note');
  const ref = note ? noteRef(note) : null;
  if (!button || !note || !ref) return false;
  e.preventDefault();
  if (button.dataset.noteAct === 'delete') {
    save({ path: ref.path, line: ref.line, index: ref.index, text: null });
    note.style.opacity = '.4';
    return true;
  }
  editNote(note, ref, save);
  return true;
}

/** ✎: the note's text in an input in its place; Enter or leaving saves, Esc puts it back. Emptied = deleted. */
function editNote(note: HTMLElement, ref: NonNullable<ReturnType<typeof noteRef>>, save: (edit: NoteEdit) => void): void {
  const shown = Array.from(note.childNodes).filter((n) => !(n instanceof Element && n.matches('ul, ol')));
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rv-note-edit';
  input.value = ref.text;
  for (const n of shown) n.parentNode?.removeChild(n);
  note.insertBefore(input, note.firstChild);
  let done = false;
  const finish = (keep: boolean) => {
    if (done) return;
    done = true;
    const text = input.value.trim();
    if (keep && text !== ref.text.trim()) save({ path: ref.path, line: ref.line, index: ref.index, text: text || null });
    input.remove();
    // Until the view is drawn again with the new text.
    for (const n of shown) note.insertBefore(n, note.querySelector(':scope > ul, :scope > ol'));
    if (keep && text !== ref.text.trim()) note.style.opacity = '.4';
  };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // not the view's or the editor's keys
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    else if (e.key === 'Enter') { e.preventDefault(); finish(true); }
  });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('mousedown', (e) => e.stopPropagation());
  setTimeout(() => { input.focus(); input.select(); });
}
