import type { AssetKind } from '../shared/model/assetReference';
import { joinPath, normalizePath } from '../shared/resolution/pathUtils';

export const DEFAULT_EXTENSIONS = ['.svg', '.css', '.scss', '.sass', '.less'] as const;

export type QueryPolicy = 'strip-for-supported-extension';

export interface PluginNavConfig {
  enabled: boolean;
  extensions: readonly string[];
  /** Absolute path-prefix alias map (values absolutized). */
  aliases: Readonly<Record<string, string>>;
  queryPolicy: QueryPolicy;
  /** False when payload had an unknown queryPolicy (interceptor must not rewrite). */
  queryPolicySupported: boolean;
}

export const DEFAULT_PLUGIN_NAV_CONFIG: PluginNavConfig = {
  enabled: true,
  extensions: [...DEFAULT_EXTENSIONS],
  aliases: {},
  queryPolicy: 'strip-for-supported-extension',
  queryPolicySupported: true,
};

const KIND_TO_EXT: Record<Exclude<AssetKind, 'unknown'>, string> = {
  svg: '.svg',
  css: '.css',
  scss: '.scss',
  sass: '.sass',
  less: '.less',
};

function asStringArray(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.length > 0) {
      out.push(item.startsWith('.') ? item.toLowerCase() : `.${item.toLowerCase()}`);
    }
  }
  return out.length > 0 ? out : [...fallback];
}

function asAliasMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!key || typeof raw !== 'string' || raw.length === 0) {
      continue;
    }
    out[key] = raw;
  }
  return out;
}

/**
 * Absolutize alias values against `baseDir` (project current directory).
 * Keys are left as configured prefixes; values become absolute `/`-normalized paths.
 */
export function absolutizeAliases(
  aliases: Readonly<Record<string, string>>,
  baseDir: string,
): Record<string, string> {
  const base = normalizePath(baseDir);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(aliases)) {
    const normalized = normalizePath(value);
    if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
      out[key] = normalized.endsWith('/') ? normalized : `${normalized}/`;
      continue;
    }
    const abs = joinPath(base, normalized);
    out[key] = abs.endsWith('/') ? abs : `${abs}/`;
  }
  return out;
}

/**
 * Normalize a configurePlugin / onConfigurationChanged payload into PluginNavConfig.
 */
export function normalizePluginConfig(
  raw: unknown,
  baseDir: string,
): PluginNavConfig {
  const obj =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const enabled = obj.enabled === undefined ? true : Boolean(obj.enabled);
  const extensions = asStringArray(obj.extensions, DEFAULT_EXTENSIONS);
  const aliases = absolutizeAliases(asAliasMap(obj.aliases), baseDir);

  const qp = obj.queryPolicy;
  const queryPolicySupported =
    qp === undefined || qp === null || qp === 'strip-for-supported-extension';

  return {
    enabled,
    extensions,
    aliases,
    queryPolicy: 'strip-for-supported-extension',
    queryPolicySupported,
  };
}

export function isExtensionAllowed(
  kind: AssetKind,
  extensions: readonly string[],
): boolean {
  if (kind === 'unknown') {
    return false;
  }
  const ext = KIND_TO_EXT[kind];
  const allowed = new Set(extensions.map((e) => e.toLowerCase()));
  return allowed.has(ext);
}

/**
 * Build the payload the extension sends via configurePlugin from VS Code settings.
 */
export function settingsToPluginPayload(settings: {
  enabled?: boolean;
  extensions?: string[];
  aliases?: Record<string, string>;
  queryPolicy?: string;
}): Record<string, unknown> {
  return {
    enabled: settings.enabled ?? true,
    extensions: settings.extensions ?? [...DEFAULT_EXTENSIONS],
    aliases: settings.aliases ?? {},
    queryPolicy: settings.queryPolicy ?? 'strip-for-supported-extension',
  };
}
