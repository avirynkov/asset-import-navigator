import type * as ts from 'typescript/lib/tsserverlibrary';

/** Phase 0 measured definition methods only (AC-3.6). */
export const DEFINITION_OVERRIDE_METHODS = [
  'getDefinitionAndBoundSpan',
  'getDefinitionAtPosition',
] as const;

export type DefinitionOverrideMethod = (typeof DEFINITION_OVERRIDE_METHODS)[number];

/**
 * Create a full pass-through LanguageService proxy, then apply caller overrides.
 */
export function createLanguageServiceProxy(
  languageService: ts.LanguageService,
): ts.LanguageService {
  const proxy: ts.LanguageService = Object.create(null);

  for (const key of Object.keys(languageService) as Array<keyof ts.LanguageService>) {
    const value = languageService[key];
    if (typeof value === 'function') {
      // @ts-expect-error - LanguageService method forwarding
      proxy[key] = (...args: unknown[]) =>
        (value as (...a: unknown[]) => unknown).apply(languageService, args);
    } else {
      // @ts-expect-error - LanguageService property forwarding
      proxy[key] = value;
    }
  }

  return proxy;
}
