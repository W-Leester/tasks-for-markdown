import { describe, expect, it } from 'vitest';
import { addNoteLines, noteBlock, parseFile, setNoteLines } from '../../../src/core/file';
import { toTaskDto } from '../../../src/core/dto';
import { dayjs } from '../../../src/core/dates/dayjs';
import { TaskIndex } from '../../../src/core/index';
import { StatusRegistry } from '../../../src/core/task';

const statusRegistry = StatusRegistry.default();
const parse = (text: string) => parseFile(text, { path: 'notes/a.md', statusRegistry });

const NOTE = [
  '- [ ] 계약서 검토 #업무 🔺 📅 2026-09-26',
  '  - 3조 위약금 조항 법무팀 확인 필요',
  '    - 더 깊은 글머리표',
  '  - [ ] 법무팀 메일 보내기',
  '    - 하위 태스크의 메모',
  '  - 9/25 김대리 회신 대기',
  '- [ ] 다음 태스크',
  '- 일반 목록',
  '  - 일반 목록의 하위(메모 아님)',
].join('\n');

describe('task notes (M13)', () => {
  it('collects direct non-checkbox children as notes, per task', () => {
    const [task, sub, next] = parse(NOTE).tasks;
    expect(task!.location.notes).toEqual([
      { line: 1, text: '3조 위약금 조항 법무팀 확인 필요' },
      { line: 5, text: '9/25 김대리 회신 대기' },
    ]);
    expect(sub!.location.notes).toEqual([{ line: 4, text: '하위 태스크의 메모' }]);
    expect(next!.location.notes).toEqual([]);
  });

  it('is exposed on TaskDto', () => {
    const task = parse(NOTE).tasks[0]!;
    const dto = toTaskDto(task, new TaskIndex(), dayjs('2026-09-29'));
    expect(dto.notes.map((n) => n.text)).toEqual(['3조 위약금 조항 법무팀 확인 필요', '9/25 김대리 회신 대기']);
  });

  it('noteBlock finds notes with their subtree end, the child indent and the marker', () => {
    const block = noteBlock(NOTE.split('\n'), 0);
    expect(block.notes.map((n) => [n.line, n.end, n.text])).toEqual([
      [1, 2, '3조 위약금 조항 법무팀 확인 필요'],
      [5, 5, '9/25 김대리 회신 대기'],
    ]);
    expect(block.children.map((c) => c.isTask)).toEqual([false, true, false]);
    expect(block.childIndent).toBe('  ');
    expect(block.marker).toBe('-');
  });

  it('noteBlock without children: indent one level under the task, default marker', () => {
    const lines = ['- 목록', '  1. [ ] 번호 태스크', '다음 문단'];
    const block = noteBlock(lines, 1);
    expect(block.notes).toEqual([]);
    expect(block.childIndent).toBe('     ');
    expect(block.marker).toBe('-');
  });

  it('noteBlock keeps blank lines inside the list and stops at a dedent', () => {
    const lines = ['- [ ] a', '', '  * 메모', '', '- [ ] b', '  - b의 메모'];
    const block = noteBlock(lines, 0);
    expect(block.notes.map((n) => n.text)).toEqual(['메모']);
    expect(block.marker).toBe('*');
  });

  it('addNoteLines / setNoteLines follow the editor rules (after sub-items of the last note; sub-tasks untouched)', () => {
    const lines = ['- [ ] a', '  * one', '    - deeper', '  - [ ] sub', '  * two', '    - under two', '- [ ] b'];
    expect(addNoteLines(lines, 0, 'three')).toEqual({ lines: ['- [ ] a', '  * one', '    - deeper', '  - [ ] sub', '  * two', '    - under two', '  * three', '- [ ] b'], line: 6 });
    expect(addNoteLines(['- [ ] b'], 0, ' x\ny ').lines).toEqual(['- [ ] b', '  - x y']);
    expect(() => addNoteLines(lines, 0, '  ')).toThrow();
    expect(setNoteLines(lines, 0, ['ONE'])).toEqual(['- [ ] a', '  * ONE', '    - deeper', '  - [ ] sub', '- [ ] b']);
    expect(setNoteLines(lines, 0, ['one', 'two', 'three', ''])).toEqual(['- [ ] a', '  * one', '    - deeper', '  - [ ] sub', '  * two', '    - under two', '  * three', '- [ ] b']);
    expect(setNoteLines(lines, 0, [])).toEqual(['- [ ] a', '  - [ ] sub', '- [ ] b']);
    expect(setNoteLines(['- [ ] b'], 0, ['n1', 'n2'])).toEqual(['- [ ] b', '  - n1', '  - n2']);
  });
});
