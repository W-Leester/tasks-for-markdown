import { describe, expect, it } from 'vitest';
import { findHeadingLine, headingAnchors, headingSlug, matchAnchor } from '../../../src/core/file/headingAnchor';

describe('heading anchors (GitHub-style)', () => {
  it('slugs like GitHub: lower case, punctuation dropped, each space a dash', () => {
    expect(headingSlug('1. 비전')).toBe('1-비전');
    expect(headingSlug('What is it? (v2)')).toBe('what-is-it-v2');
    expect(headingSlug('**굵게** 제목')).toBe('굵게-제목');
    expect(headingSlug('snake_case & more')).toBe('snake_case--more');
  });

  it('repeats get -1, -2', () => {
    expect(headingAnchors(['메모', '할 일', '메모', '메모'])).toEqual(['메모', '할-일', '메모-1', '메모-2']);
  });

  it('matches the anchor as written, percent-encoded, or the heading text itself', () => {
    const anchors = headingAnchors(['1. 비전', 'Vision Plan']);
    expect(matchAnchor(anchors, '1-비전')).toBe(0);
    expect(matchAnchor(anchors, encodeURIComponent('1-비전'))).toBe(0);
    expect(matchAnchor(anchors, '1. 비전')).toBe(0);
    expect(matchAnchor(anchors, 'Vision-Plan')).toBe(1);
    expect(matchAnchor(anchors, 'nope')).toBe(-1);
    expect(matchAnchor(anchors, '%E0')).toBe(-1); // a stray % does not throw
  });

  it('finds the heading line in a note, skipping code fences and closing #s', () => {
    const text = ['# 제목', '', '```', '# 코드 안', '```', '## 2. 계획 ##', '~~~', '## 2. 계획', '~~~', '## 2. 계획'].join('\r\n');
    expect(findHeadingLine(text, '2-계획')).toBe(5);
    expect(findHeadingLine(text, '2-계획-1')).toBe(9);
    expect(findHeadingLine(text, '코드-안')).toBe(-1);
  });
});
