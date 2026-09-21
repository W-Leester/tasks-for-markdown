import { describe, expect, it } from 'vitest';
import { parseFile } from '../../../src/core/file';
import { TaskIndex, dependants, findDependencyCycle, isBlocked, isBlocking } from '../../../src/core/index';
import { StatusRegistry } from '../../../src/core/task';

const reg = StatusRegistry.default();
const build = (text: string) => {
  const idx = new TaskIndex();
  const r = parseFile(text, { path: 'd.md', statusRegistry: reg });
  idx.setFile({ key: 'd.md', path: 'd.md', tasks: r.tasks, headings: r.headings, frontmatterTags: [] }, true);
  return idx;
};
const byDesc = (idx: TaskIndex, d: string) => idx.all().find((t) => t.description === d)!;

describe('dependencies', () => {
  const idx = build(['- [ ] a 🆔 a1 ⛔ b1', '- [ ] b 🆔 b1 ⛔ c1', '- [x] c 🆔 c1', '- [ ] d ⛔ a1', '- [ ] loop1 🆔 l1 ⛔ l2', '- [ ] loop2 🆔 l2 ⛔ l3', '- [ ] loop3 🆔 l3 ⛔ l1', '- [ ] self 🆔 s1 ⛔ s1', '- [ ] free'].join('\n'));

  it('blocked only while a dependency is unfinished', () => {
    expect(isBlocked(byDesc(idx, 'a'), idx)).toBe(true); // b unfinished
    expect(isBlocked(byDesc(idx, 'b'), idx)).toBe(false); // c done
    expect(isBlocked(byDesc(idx, 'free'), idx)).toBe(false);
  });

  it('blocking and dependants', () => {
    expect(isBlocking(byDesc(idx, 'a'), idx)).toBe(true); // d waits on a1
    expect(isBlocking(byDesc(idx, 'c'), idx)).toBe(false); // completed
    expect(dependants(byDesc(idx, 'b'), idx).map((t) => t.description)).toEqual(['a']);
  });

  it('finds cycles including self-dependency, and none otherwise', () => {
    expect(findDependencyCycle(byDesc(idx, 'loop1'), idx)).toEqual(['l1', 'l2', 'l3', 'l1']);
    expect(findDependencyCycle(byDesc(idx, 'self'), idx)).toEqual(['s1', 's1']);
    expect(findDependencyCycle(byDesc(idx, 'a'), idx)).toBeNull();
    expect(findDependencyCycle(byDesc(idx, 'free'), idx)).toBeNull();
  });
});
