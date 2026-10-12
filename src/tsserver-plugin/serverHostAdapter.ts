import type * as ts from 'typescript/lib/tsserverlibrary';
import {
  createTsserverFileSystem,
  type TsserverHostLike,
} from '../platform/tsserverFileSystem';
import type { AssetResolverHost } from '../shared/model/resolvedAsset';

/**
 * Build an {@link AssetResolverHost} from plugin create info (server host).
 * Implements both `fileExists` and `readFile` (required for tsconfig paths).
 */
export function createServerHostAdapter(
  info: ts.server.PluginCreateInfo,
): AssetResolverHost {
  const serverHost = info.serverHost as TsserverHostLike;
  return createTsserverFileSystem(serverHost);
}
