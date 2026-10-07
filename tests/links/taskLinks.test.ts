import { describe, expect, it } from 'vitest';
import { parseTaskLink, queryLink, taskLink } from '../../src/links/taskLinks';

/** What the URI handler receives: VS Code decodes the query once (vscode.Uri.parse). */
function received(link: string): { path: string; query: string } {
  const m = /^[a-z-]+:\/\/[^/]+(\/[^?]*)\??(.*)$/.exec(link)!;
  return { path: m[1]!, query: decodeURIComponent(m[2]!) };
}
const roundTrip = (link: string) => { const r = received(link); return parseTaskLink(r.path, r.query); };

describe('task links (M23)', () => {
  it('builds open links with a 1-based line for the editor scheme', () => {
    expect(taskLink('vscode', 'notes/work.md', 11)).toBe('vscode://hastycapybara.tasks-for-markdown/open?path=notes%252Fwork.md&line=12');
    expect(taskLink('cursor', 'a.md', 0)).toMatch(/^cursor:\/\/hastycapybara\.tasks-for-markdown\/open\?/);
  });

  it('round-trips paths and queries, including &, =, +, % and Korean', () => {
    expect(roundTrip(taskLink('vscode', 'R&D/회의 노트+1.md', 4))).toEqual({ kind: 'open', path: 'R&D/회의 노트+1.md', line: 4 });
    expect(roundTrip(taskLink('vscode', 'notes\\win.md', 0))).toEqual({ kind: 'open', path: 'notes/win.md', line: 0 });
    const q = 'not done\ndescription includes R&D = 100%\ntags include #업무';
    expect(roundTrip(queryLink('vscode', q))).toEqual({ kind: 'query', text: q });
  });

  it('accepts simple hand-written links with one layer of encoding', () => {
    expect(parseTaskLink('/open', 'path=notes/work.md&line=3')).toEqual({ kind: 'open', path: 'notes/work.md', line: 2 });
    expect(parseTaskLink('/open', 'path=a.md')).toEqual({ kind: 'open', path: 'a.md', line: 0 });
    expect(parseTaskLink('/query', 'text=due today')).toEqual({ kind: 'query', text: 'due today' });
  });

  it('refuses paths outside the workspace and bad line numbers', () => {
    expect(parseTaskLink('/open', 'path=')).toEqual({ kind: 'error', code: 'noPath' });
    expect(parseTaskLink('/open', 'path=/etc/passwd')).toMatchObject({ kind: 'error', code: 'absolutePath' });
    expect(parseTaskLink('/open', 'path=C:/x.md')).toMatchObject({ kind: 'error', code: 'absolutePath' });
    expect(parseTaskLink('/open', 'path=notes/../../secret.md')).toMatchObject({ kind: 'error', code: 'parentPath' });
    expect(parseTaskLink('/open', 'path=a.md&line=0')).toMatchObject({ kind: 'error', code: 'badLine', value: '0' });
    expect(parseTaskLink('/open', 'path=a.md&line=x')).toMatchObject({ kind: 'error', code: 'badLine' });
  });

  it('never runs JavaScript query functions from a link', () => {
    expect(parseTaskLink('/query', 'text=')).toEqual({ kind: 'error', code: 'noQuery' });
    expect(roundTrip(queryLink('vscode', 'not done\nfilter by function task.urgency > 5'))).toEqual({ kind: 'error', code: 'functionQuery' });
    expect(roundTrip(queryLink('vscode', 'GROUP BY FUNCTION task.file.folder'))).toEqual({ kind: 'error', code: 'functionQuery' });
    // A description containing the words is fine.
    expect(roundTrip(queryLink('vscode', 'description includes sort by function'))).toMatchObject({ kind: 'query' });
  });

  it('opens the Get Started guide (README link; the vscode.dev redirect adds a url parameter)', () => {
    expect(parseTaskLink('/guide', '')).toEqual({ kind: 'guide' });
    expect(parseTaskLink('/guide', 'url=vscode://hastycapybara.tasks-for-markdown/guide')).toEqual({ kind: 'guide' });
  });

  it('rejects unknown actions', () => {
    expect(parseTaskLink('/delete', 'path=a.md')).toEqual({ kind: 'error', code: 'unknownAction', value: 'delete' });
    expect(parseTaskLink('/', '')).toEqual({ kind: 'error', code: 'unknownAction', value: '' });
  });
});
