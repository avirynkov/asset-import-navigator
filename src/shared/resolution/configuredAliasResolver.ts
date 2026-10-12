import { joinPath, normalizePath } from './pathUtils';

/**
 * Resolve via configured extension aliases (absolute path-prefix values).
 * Longest-prefix key match among the plain map.
 */
export function resolveConfiguredAliasCandidate(
  physicalSpecifier: string,
  aliases: Readonly<Record<string, string>>,
): string | undefined {
  let bestKey: string | undefined;
  let bestLen = -1;

  for (const key of Object.keys(aliases)) {
    if (key.length > bestLen && physicalSpecifier.startsWith(key)) {
      bestKey = key;
      bestLen = key.length;
    }
  }

  if (bestKey === undefined) {
    return undefined;
  }

  const prefix = normalizePath(aliases[bestKey]!);
  const rest = physicalSpecifier.slice(bestKey.length);
  if (rest === '' || rest === '/') {
    return prefix;
  }
  return joinPath(prefix, rest.replace(/^\//, ''));
}
