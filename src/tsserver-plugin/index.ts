import type tslib from 'typescript/lib/tsserverlibrary';
import { attachTypeScript, createPlugin } from './plugin';

function init(modules: { typescript: typeof tslib }): { create: typeof createPlugin } {
  const typescript = modules.typescript;
  attachTypeScript(typescript);

  function create(info: tslib.server.PluginCreateInfo): tslib.LanguageService {
    return createPlugin(info);
  }

  return { create };
}

export = init;
