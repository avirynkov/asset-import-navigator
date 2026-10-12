import type * as ts from 'typescript/lib/tsserverlibrary';
import { trySpikeAssetDefinition } from './definitionSpike';

/** Set false to measure baseline ambient navigation without rewrite. */
export const SPIKE_REWRITE_ENABLED = true;

const DEFINITION_METHODS = [
  'getDefinitionAndBoundSpan',
  'getDefinitionAtPosition',
  'getTypeDefinitionAtPosition',
] as const;

let typescriptModule: typeof ts | undefined;

export function attachTypeScript(typescript: typeof ts): void {
  typescriptModule = typescript;
}

export function createPlugin(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const ls = info.languageService;
  const logger = info.project.projectService.logger;

  logger.info('[asset-import-navigator-ts-plugin] create() — plugin loaded');

  const proxy: ts.LanguageService = Object.create(null);

  for (const key of Object.keys(ls) as Array<keyof ts.LanguageService>) {
    const value = ls[key];
    if (typeof value === 'function') {
      // @ts-expect-error - LanguageService method forwarding
      proxy[key] = (...args: unknown[]) =>
        (value as (...a: unknown[]) => unknown).apply(ls, args);
    } else {
      // @ts-expect-error - LanguageService property forwarding
      proxy[key] = value;
    }
  }

  const wrapDefinitionMethod = (methodName: (typeof DEFINITION_METHODS)[number]): void => {
    const original = ls[methodName];
    if (typeof original !== 'function') {
      return;
    }

    // @ts-expect-error - dynamic wrap of definition APIs
    proxy[methodName] = (fileName: string, position: number, ...rest: unknown[]) => {
      logger.info(
        `[asset-import-navigator-ts-plugin] ${methodName} file=${fileName} pos=${position}`,
      );

      if (SPIKE_REWRITE_ENABLED && typescriptModule) {
        const program = ls.getProgram();
        const spike = trySpikeAssetDefinition(
          typescriptModule,
          program,
          fileName,
          position,
        );
        if (spike) {
          logger.info(
            `[asset-import-navigator-ts-plugin] rewrite → ${spike.definitions[0]?.fileName}`,
          );
          if (methodName === 'getDefinitionAndBoundSpan') {
            const result: ts.DefinitionInfoAndBoundSpan = {
              definitions: spike.definitions,
              textSpan: spike.textSpan,
            };
            return result;
          }
          return spike.definitions;
        }
      }

      // @ts-expect-error - forward to original LS method
      return original.call(ls, fileName, position, ...rest);
    };
  };

  for (const method of DEFINITION_METHODS) {
    wrapDefinitionMethod(method);
  }

  return proxy;
}
