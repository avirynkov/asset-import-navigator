export type AssetKind =
  | 'svg'
  | 'css'
  | 'scss'
  | 'sass'
  | 'less'
  | 'unknown';

export interface AssetReference {
  originalSpecifier: string;
  physicalSpecifier: string;
  query: string | null;
  hash: string | null;
  kind: AssetKind;
  sourceStart: number;
  sourceEnd: number;
  symbolRanges: Array<{ start: number; end: number }>;
}
