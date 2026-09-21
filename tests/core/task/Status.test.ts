import { describe, expect, it } from 'vitest';
import { Status, StatusRegistry, StatusType } from '../../../src/core/task';

describe('StatusRegistry', () => {
  const reg = StatusRegistry.default();

  it('registers the four default statuses', () => {
    expect(reg.all().map((s) => s.symbol)).toEqual([' ', 'x', '/', '-']);
    expect(reg.bySymbol(' ').type).toBe(StatusType.TODO);
    expect(reg.bySymbol('x').type).toBe(StatusType.DONE);
    expect(reg.bySymbol('/').type).toBe(StatusType.IN_PROGRESS);
    expect(reg.bySymbol('-').type).toBe(StatusType.CANCELLED);
  });

  it('cycles todo -> done -> todo', () => {
    const todo = reg.bySymbol(' ');
    const done = reg.next(todo);
    expect(done.symbol).toBe('x');
    expect(reg.next(done).symbol).toBe(' ');
  });

  it('in progress and cancelled follow their next symbols', () => {
    expect(reg.next(reg.bySymbol('/')).symbol).toBe('x');
    expect(reg.next(reg.bySymbol('-')).symbol).toBe(' ');
  });

  it('returns a TODO placeholder for unknown symbols', () => {
    const s = reg.bySymbol('?');
    expect(reg.has('?')).toBe(false);
    expect(s.type).toBe(StatusType.TODO);
    expect(s.nextSymbol).toBe('x');
    expect(s.name).toBe('Unknown');
  });

  it('custom registrations override defaults', () => {
    const custom = new StatusRegistry([
      { symbol: ' ', name: 'Todo', nextSymbol: '/', type: StatusType.TODO },
      { symbol: '/', name: 'Doing', nextSymbol: 'X', type: StatusType.IN_PROGRESS },
      { symbol: 'X', name: 'Done', nextSymbol: ' ', type: StatusType.DONE },
    ]);
    const chain = [custom.bySymbol(' ')];
    chain.push(custom.next(chain[0]!));
    chain.push(custom.next(chain[1]!));
    expect(chain.map((s) => s.symbol)).toEqual([' ', '/', 'X']);
    expect(chain[2]!.isCompleted()).toBe(true);
  });

  it('rejects multi-character symbols', () => {
    expect(() => new Status({ symbol: 'xx', name: 'bad', nextSymbol: ' ', type: StatusType.DONE })).toThrow();
  });
});
