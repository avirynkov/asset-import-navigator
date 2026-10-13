import { describe, expect, it } from 'vitest';
import {
  extractStylesheetMetadata,
  isCssModuleFileName,
} from '../../../preview/stylesheetMetadata';

describe('stylesheetMetadata', () => {
  it('classifies module vs plain', () => {
    expect(isCssModuleFileName('Card.module.scss')).toBe(true);
    expect(isCssModuleFileName('Card.module.css')).toBe(true);
    expect(isCssModuleFileName('global.scss')).toBe(false);
    expect(
      extractStylesheetMetadata('/x/Card.module.less', 12).moduleKind,
    ).toBe('module');
    expect(extractStylesheetMetadata('/x/plain.sass', 3).moduleKind).toBe(
      'plain',
    );
  });
});
