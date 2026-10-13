import type * as ts from 'typescript/lib/tsserverlibrary';
import {
  DEFAULT_PLUGIN_NAV_CONFIG,
  normalizePluginConfig,
  type PluginNavConfig,
} from './configuration';
import {
  createInterceptorCache,
  tryRewriteAssetDefinition,
  type DefinitionInterceptorContext,
} from './definitionInterceptor';
import {
  createLanguageServiceProxy,
  DEFINITION_OVERRIDE_METHODS,
} from './languageServiceProxy';
import { createServerHostAdapter } from './serverHostAdapter';
import { invalidateOnExtensionConfigChange } from '../shared/resolution/resolutionCache';
import { setTypeScript } from '../shared/typescriptRuntime';

/** Last configurePlugin / onConfigurationChanged payload (module-level). */
let latestConfigPayload: unknown = undefined;

/** Active interceptor caches so config changes can invalidate them. */
const activeCaches = new Set<ReturnType<typeof createInterceptorCache>>();

export function attachTypeScript(typescript: typeof ts): void {
  // Parse tsserver's own SourceFiles with tsserver's TypeScript build.
  setTypeScript(typescript);
}

export function onConfigurationChanged(config: unknown): void {
  latestConfigPayload = config;
  for (const cache of activeCaches) {
    invalidateOnExtensionConfigChange(cache);
  }
}

export function getLatestConfigPayload(): unknown {
  return latestConfigPayload;
}

/** Exposed for tests / AC-3.6. */
export { DEFINITION_OVERRIDE_METHODS };

export function createPlugin(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const ls = info.languageService;
  const logger = info.project.projectService.logger;
  const host = createServerHostAdapter(info);
  const cache = createInterceptorCache();
  activeCaches.add(cache);

  const baseDir = info.project.getCurrentDirectory();

  const getConfig = (): PluginNavConfig => {
    if (latestConfigPayload === undefined) {
      // Zero-config defaults until configurePlugin runs
      return {
        ...DEFAULT_PLUGIN_NAV_CONFIG,
        aliases: normalizePluginConfig({}, baseDir).aliases,
      };
    }
    return normalizePluginConfig(latestConfigPayload, baseDir);
  };

  logger.info('[asset-import-navigator-ts-plugin] create() — plugin loaded');

  const proxy = createLanguageServiceProxy(ls);

  const ctx: DefinitionInterceptorContext = {
    getConfig,
    host,
    cache,
    getScriptVersion: (fileName: string) => {
      try {
        return info.languageServiceHost.getScriptVersion(fileName);
      } catch {
        return '0';
      }
    },
    logger,
  };

  const wrapDefinitionMethod = (
    methodName: (typeof DEFINITION_OVERRIDE_METHODS)[number],
  ): void => {
    const original = ls[methodName];
    if (typeof original !== 'function') {
      return;
    }

    // @ts-expect-error - dynamic wrap of definition APIs
    proxy[methodName] = (fileName: string, position: number, ...rest: unknown[]) => {
      logger.info(
        `[asset-import-navigator-ts-plugin] ${methodName} file=${fileName} pos=${position}`,
      );

      try {
        const program = ls.getProgram();
        const rewrite = tryRewriteAssetDefinition(program, fileName, position, ctx);
        if (rewrite) {
          if (methodName === 'getDefinitionAndBoundSpan') {
            const result: ts.DefinitionInfoAndBoundSpan = {
              definitions: rewrite.definitions,
              textSpan: rewrite.textSpan,
            };
            return result;
          }
          return rewrite.definitions;
        }
      } catch (err) {
        logger.info(
          `[asset-import-navigator-ts-plugin] rewrite error — delegating: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      // @ts-expect-error - forward to original LS method
      return original.call(ls, fileName, position, ...rest);
    };
  };

  for (const method of DEFINITION_OVERRIDE_METHODS) {
    wrapDefinitionMethod(method);
  }

  return proxy;
}
