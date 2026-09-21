import { describe, expect, it, vi } from 'vitest';
import { parseFile } from '../../../src/core/file';
import { TaskIndex } from '../../../src/core/index';
import { StatusRegistry } from '../../../src/core/task';

const statusRegistry = StatusRegistry.default();
const entry = (key: string, text: string) => {
  const r = parseFile(text, { path: key, statusRegistry });
  return { key, path: key, tasks: r.tasks, headings: r.headings, frontmatterTags: r.frontmatterTags };
};

describe('TaskIndex', () => {
  it('stores files, lists tasks in file order and bumps the version', () => {
    const idx = new TaskIndex();
    expect(idx.version).toBe(0);
    idx.setFile(entry('a.md', '- [ ] a1\n- [ ] a2'));
    idx.setFile(entry('b.md', '- [ ] b1'));
    expect(idx.version).toBe(2);
    expect(idx.all().map((t) => t.description)).toEqual(['a1', 'a2', 'b1']);
    expect(idx.taskCount()).toBe(3);
    expect(idx.fileCount()).toBe(2);
  });

  it('replaces a file wholesale and invalidates caches', () => {
    const idx = new TaskIndex();
    idx.setFile(entry('a.md', '- [ ] old 🆔 x1'));
    expect(idx.byId('x1')).toHaveLength(1);
    idx.setFile(entry('a.md', '- [ ] new'));
    expect(idx.all().map((t) => t.description)).toEqual(['new']);
    expect(idx.byId('x1')).toHaveLength(0);
  });

  it('emits per-file change events and supports silent bulk updates', () => {
    const idx = new TaskIndex();
    const spy = vi.fn();
    idx.onDidChange(spy);
    idx.setFile(entry('a.md', '- [ ] a'));
    expect(spy).toHaveBeenCalledWith({ changed: ['a.md'], removed: [] });
    idx.setFile(entry('b.md', '- [ ] b'), true);
    expect(spy).toHaveBeenCalledTimes(1);
    idx.emitBulkChange({ changed: ['b.md'], removed: [] });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(idx.removeFile('a.md')).toBe(true);
    expect(spy).toHaveBeenLastCalledWith({ changed: [], removed: ['a.md'] });
    expect(idx.removeFile('missing')).toBe(false);
  });

  it('retainOnly drops files not seen by a rescan', () => {
    const idx = new TaskIndex();
    idx.setFile(entry('a.md', '- [ ] a'), true);
    idx.setFile(entry('b.md', '- [ ] b'), true);
    idx.markSkipped({ key: 'big.md', path: 'big.md', reason: 'too-large', sizeKB: 5000 });
    expect(idx.retainOnly(new Set(['a.md']))).toEqual(['b.md', 'big.md']);
    expect(idx.fileKeys()).toEqual(['a.md']);
    expect(idx.skippedFiles()).toEqual([]);
  });

  it('tracks skipped files separately from indexed ones', () => {
    const idx = new TaskIndex();
    idx.setFile(entry('a.md', '- [ ] a'));
    idx.markSkipped({ key: 'a.md', path: 'a.md', reason: 'too-large', sizeKB: 2048 });
    expect(idx.fileCount()).toBe(0);
    expect(idx.skippedFiles()[0]!.sizeKB).toBe(2048);
    idx.setFile(entry('a.md', '- [ ] a'));
    expect(idx.skippedFiles()).toEqual([]);
  });

  it('finds tasks by id and by position', () => {
    const idx = new TaskIndex();
    idx.setFile(entry('a.md', '# H\n- [ ] one 🆔 k1\n- [ ] two 🆔 k1'));
    expect(idx.byId('k1').map((t) => t.description)).toEqual(['one', 'two']);
    expect(idx.taskAt('a.md', 2)!.description).toBe('two');
    expect(idx.taskAt('a.md', 0)).toBeUndefined();
  });

  it('reports progress', () => {
    const idx = new TaskIndex();
    const spy = vi.fn();
    idx.onDidChangeProgress(spy);
    idx.setProgress({ state: 'scanning', done: 1, total: 10 });
    expect(idx.state).toBe('scanning');
    expect(spy).toHaveBeenCalledWith({ state: 'scanning', done: 1, total: 10 });
  });
});
