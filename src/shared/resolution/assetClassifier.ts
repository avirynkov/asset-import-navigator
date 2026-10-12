import type { AssetKind } from '../model/assetReference';

/**
 * Classify a physical module specifier by extension.
 * Input must already be physical (no query/hash).
 */
export function classifyAsset(physicalSpecifier: string): AssetKind {
  const lower = physicalSpecifier.toLowerCase();

  if (lower.endsWith('.module.css') || lower.endsWith('.css')) {
    return 'css';
  }
  if (lower.endsWith('.module.scss') || lower.endsWith('.scss')) {
    return 'scss';
  }
  if (lower.endsWith('.module.sass') || lower.endsWith('.sass')) {
    return 'sass';
  }
  if (lower.endsWith('.module.less') || lower.endsWith('.less')) {
    return 'less';
  }
  if (lower.endsWith('.svg')) {
    return 'svg';
  }

  return 'unknown';
}
