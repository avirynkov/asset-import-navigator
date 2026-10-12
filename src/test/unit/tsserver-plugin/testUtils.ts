import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import {
  DEFAULT_PLUGIN_NAV_CONFIG,
  type PluginNavConfig,
} from '../../../tsserver-plugin/configuration';
import {
  createInterceptorCache,
  tryRewriteAssetDefinition,
  type DefinitionInterceptorContext,
  type DefinitionRewriteResult,
} from '../../../tsserver-plugin/definitionInterceptor';
import { createTsserverFileSystem } from '../../../platform/tsserverFileSystem';
import { normalizePath } from '../../../shared/resolution/pathUtils';

export function createFsInterceptorContext(
  config: PluginNavConfig = DEFAULT_PLUGIN_NAV_CONFIG,
): DefinitionInterceptorContext {
  const host = createTsserverFileSystem({
    fileExists: (p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
      } catch {
        return false;
      }
    },
    readFile: (p) => {
      try {
        return fs.readFileSync(p, 'utf8');
      } catch {
        return undefined;
      }
    },
  });

  return {
    getConfig: () => config,
    host,
    cache: createInterceptorCache(),
    getScriptVersion: () => '1',
  };
}

export function tryRewrite(
  program: ts.Program,
  fileName: string,
  position: number,
  config?: PluginNavConfig,
): DefinitionRewriteResult | undefined {
  return tryRewriteAssetDefinition(
    program as unknown as import('typescript/lib/tsserverlibrary').Program,
    fileName,
    position,
    createFsInterceptorContext(config),
  );
}

export function createProgramFromFixture(fixtureDir: string): ts.Program {
  const configPath = path.join(fixtureDir, 'tsconfig.json');
  if (fs.existsSync(configPath)) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      fixtureDir,
    );
    return ts.createProgram({
      rootNames: parsed.fileNames,
      options: parsed.options,
    });
  }

  const rootNames = fs
    .readdirSync(fixtureDir)
    .filter((n) => /\.(tsx?|jsx?)$/.test(n))
    .map((n) => path.join(fixtureDir, n));

  return ts.createProgram({
    rootNames,
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    },
  });
}

export function createLanguageServiceForFixture(fixtureDir: string): {
  service: ts.LanguageService;
  program: ts.Program;
  rootFiles: string[];
} {
  const files = new Map<string, string>();
  for (const name of fs.readdirSync(fixtureDir)) {
    if (!/\.(tsx?|jsx?|d\.ts)$/.test(name) && !name.endsWith('.d.ts')) {
      continue;
    }
    const full = path.join(fixtureDir, name);
    if (fs.statSync(full).isFile()) {
      files.set(full, fs.readFileSync(full, 'utf8'));
    }
  }
  // Also include client.d.ts style ambient files
  for (const name of fs.readdirSync(fixtureDir)) {
    const full = path.join(fixtureDir, name);
    if (fs.statSync(full).isFile() && name.endsWith('.d.ts')) {
      files.set(full, fs.readFileSync(full, 'utf8'));
    }
  }

  const rootFiles = [...files.keys()].filter((f) => !f.endsWith('.d.ts'));
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
  };

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [...files.keys()],
    getScriptVersion: () => '1',
    getScriptSnapshot: (fileName) => {
      const text = files.get(fileName) ?? fs.readFileSync(fileName, 'utf8');
      return ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => fixtureDir,
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };

  const service = ts.createLanguageService(host);
  return { service, program: service.getProgram()!, rootFiles };
}

export function positionOf(sourceText: string, needle: string, occurrence = 0): number {
  let from = 0;
  let found = -1;
  for (let i = 0; i <= occurrence; i++) {
    found = sourceText.indexOf(needle, from);
    if (found < 0) {
      throw new Error(`needle not found: ${needle}`);
    }
    from = found + needle.length;
  }
  return found;
}

export function norm(p: string): string {
  return normalizePath(p);
}
