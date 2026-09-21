import { describe, expect, it } from 'vitest';
import { extractTags } from '../../../src/core/task';

describe('extractTags', () => {
  it('finds simple, nested and unicode tags', () => {
    expect(extractTags('write report #work #proj/alpha #업무 done')).toEqual(['#work', '#proj/alpha', '#업무']);
  });

  it('ignores # inside urls and mid-word', () => {
    expect(extractTags('see https://x.io/a#frag and foo#bar')).toEqual([]);
  });

  it('ignores purely numeric tags and dedupes', () => {
    expect(extractTags('#123 #a1 #a1')).toEqual(['#a1']);
  });

  it('accepts a tag at the very start', () => {
    expect(extractTags('#task buy milk')).toEqual(['#task']);
  });
});
