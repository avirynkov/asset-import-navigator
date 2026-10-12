import { describe, expect, it } from 'vitest';
import { parseModuleSpecifier } from '../../../shared/parser/moduleSpecifier';

describe('parseModuleSpecifier', () => {
  it('passthrough when no query or hash', () => {
    expect(parseModuleSpecifier('./icon.svg')).toEqual({
      physicalSpecifier: './icon.svg',
      query: null,
      hash: null,
    });
  });

  it('strips ?react / ?url / ?raw deterministically (RES-05)', () => {
    expect(parseModuleSpecifier('./icon.svg?react')).toEqual({
      physicalSpecifier: './icon.svg',
      query: 'react',
      hash: null,
    });
    expect(parseModuleSpecifier('@/assets/icon.svg?url')).toEqual({
      physicalSpecifier: '@/assets/icon.svg',
      query: 'url',
      hash: null,
    });
    expect(parseModuleSpecifier('./icon.svg?raw')).toEqual({
      physicalSpecifier: './icon.svg',
      query: 'raw',
      hash: null,
    });
  });

  it('strips hash', () => {
    expect(parseModuleSpecifier('./theme.css#hash')).toEqual({
      physicalSpecifier: './theme.css',
      query: null,
      hash: 'hash',
    });
  });

  it('handles query and hash together', () => {
    expect(parseModuleSpecifier('./icon.svg?react#frag')).toEqual({
      physicalSpecifier: './icon.svg',
      query: 'react',
      hash: 'frag',
    });
  });

  it('maps empty query/hash segments to null', () => {
    expect(parseModuleSpecifier('./icon.svg?')).toEqual({
      physicalSpecifier: './icon.svg',
      query: null,
      hash: null,
    });
    expect(parseModuleSpecifier('./icon.svg#')).toEqual({
      physicalSpecifier: './icon.svg',
      query: null,
      hash: null,
    });
  });
});
