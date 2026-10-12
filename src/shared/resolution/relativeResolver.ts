import { isRelativeSpecifier, resolveRelative } from './pathUtils';

/**
 * Resolve a relative physical specifier against the importing file.
 * Returns a candidate absolute path, or undefined if not a relative specifier.
 * Existence is checked by the orchestrator; missing relative must not fall through.
 */
export function resolveRelativeCandidate(
  importerPath: string,
  physicalSpecifier: string,
): string | undefined {
  if (!isRelativeSpecifier(physicalSpecifier)) {
    return undefined;
  }
  return resolveRelative(importerPath, physicalSpecifier);
}
