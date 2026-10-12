import type { AssetKind } from './assetReference';

export interface ResolvedAsset {
  physicalUri: string;
  originalSpecifier: string;
  physicalSpecifier: string;
  kind: AssetKind;
  query: string | null;
}

export interface AssetResolverHost {
  fileExists(uri: string): boolean | Promise<boolean>;
  readFile?(uri: string): Uint8Array | Promise<Uint8Array>;
}
