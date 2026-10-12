import { describe, expect, it } from 'vitest';
import { classifyAsset } from '../../../shared/resolution/assetClassifier';

describe('classifyAsset', () => {
  it('classifies plain v1 extensions', () => {
    expect(classifyAsset('./icon.svg')).toBe('svg');
    expect(classifyAsset('./styles.css')).toBe('css');
    expect(classifyAsset('./styles.scss')).toBe('scss');
    expect(classifyAsset('./styles.sass')).toBe('sass');
    expect(classifyAsset('./styles.less')).toBe('less');
  });

  it('classifies *.module.* variants as stylesheet kinds', () => {
    expect(classifyAsset('./Button.module.css')).toBe('css');
    expect(classifyAsset('./Button.module.scss')).toBe('scss');
    expect(classifyAsset('./Button.module.sass')).toBe('sass');
    expect(classifyAsset('./Button.module.less')).toBe('less');
  });

  it('matches extensions case-insensitively without rewriting', () => {
    expect(classifyAsset('./Icon.SVG')).toBe('svg');
    expect(classifyAsset('./Card.MODULE.SCSS')).toBe('scss');
  });

  it('returns unknown for unsupported or empty', () => {
    expect(classifyAsset('./x.png')).toBe('unknown');
    expect(classifyAsset('./util.ts')).toBe('unknown');
    expect(classifyAsset('lodash')).toBe('unknown');
    expect(classifyAsset('')).toBe('unknown');
  });
});
