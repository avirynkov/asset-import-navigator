import type tslib from 'typescript/lib/tsserverlibrary';
import {
  attachTypeScript,
  createPlugin,
  onConfigurationChanged as applyConfigurationChanged,
} from './plugin';

function init(modules: { typescript: typeof tslib }): {
  create: typeof createPlugin;
  onConfigurationChanged: (config: unknown) => void;
} {
  const typescript = modules.typescript;
  attachTypeScript(typescript);

  function create(info: tslib.server.PluginCreateInfo): tslib.LanguageService {
    return createPlugin(info);
  }

  function onConfigurationChanged(config: unknown): void {
    applyConfigurationChanged(config);
  }

  return { create, onConfigurationChanged };
}

export = init;
