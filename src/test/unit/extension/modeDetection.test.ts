import { describe, expect, it } from 'vitest';
import { detectNavigationMode } from '../../../extension/modeDetection';

describe('detectNavigationMode', () => {
  it('useTsgo true → Mode B native/tsgo even if configurePlugin available', () => {
    const report = detectNavigationMode({
      useTsgo: true,
      configurePluginAvailable: true,
    });
    expect(report.kind).toBe('mode-b');
    if (report.kind === 'mode-b') {
      expect(report.reason).toBe('native-tsgo');
    }
    expect(report.label).toContain('Mode B');
  });

  it('configurePlugin available → Mode A expected', () => {
    const report = detectNavigationMode({
      useTsgo: false,
      configurePluginAvailable: true,
    });
    expect(report.kind).toBe('mode-a-expected');
    expect(report.label).toContain('Mode A expected');
  });

  it('no configurePlugin → Mode B plugin-unavailable', () => {
    const report = detectNavigationMode({
      useTsgo: false,
      configurePluginAvailable: false,
    });
    expect(report.kind).toBe('mode-b');
    if (report.kind === 'mode-b') {
      expect(report.reason).toBe('plugin-unavailable');
    }
  });
});
