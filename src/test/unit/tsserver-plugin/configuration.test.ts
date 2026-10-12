import { describe, expect, it } from 'vitest';
import {
  absolutizeAliases,
  isExtensionAllowed,
  normalizePluginConfig,
} from '../../../tsserver-plugin/configuration';

describe('plugin configuration', () => {
  it('absolutizes relative alias values against baseDir', () => {
    const abs = absolutizeAliases({ '@/': 'src/' }, '/proj');
    expect(abs['@/']).toBe('/proj/src/');
  });

  it('keeps absolute alias values', () => {
    const abs = absolutizeAliases({ '@assets/': '/abs/assets/' }, '/proj');
    expect(abs['@assets/']).toBe('/abs/assets/');
  });

  it('defaults enabled and extensions', () => {
    const cfg = normalizePluginConfig({}, '/proj');
    expect(cfg.enabled).toBe(true);
    expect(cfg.extensions).toContain('.svg');
    expect(cfg.queryPolicySupported).toBe(true);
  });

  it('marks unknown queryPolicy unsupported', () => {
    const cfg = normalizePluginConfig(
      { queryPolicy: 'keep-query' },
      '/proj',
    );
    expect(cfg.queryPolicySupported).toBe(false);
  });

  it('isExtensionAllowed respects allow-list', () => {
    expect(isExtensionAllowed('svg', ['.svg'])).toBe(true);
    expect(isExtensionAllowed('scss', ['.svg', '.css'])).toBe(false);
  });
});
