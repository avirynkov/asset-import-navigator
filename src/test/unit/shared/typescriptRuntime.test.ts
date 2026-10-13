import { afterEach, describe, expect, it } from 'vitest';
import ts from 'typescript';
import { findAssetReferenceAt } from '../../../shared/parser/assetReferenceDetector';
import { getTypeScript, setTypeScript } from '../../../shared/typescriptRuntime';
import { attachTypeScript } from '../../../tsserver-plugin/plugin';

function countingProxy(): { proxy: typeof ts; accessed: Set<string> } {
  const accessed = new Set<string>();
  const proxy = new Proxy(ts, {
    get(target, prop, receiver) {
      accessed.add(String(prop));
      return Reflect.get(target, prop, receiver);
    },
  });
  return { proxy, accessed };
}

describe('typescriptRuntime injection', () => {
  afterEach(() => {
    setTypeScript(undefined);
  });

  it('defaults to the packaged typescript module', () => {
    expect(getTypeScript().version).toBe(ts.version);
  });

  it('detector uses the injected module (tsserver build) instead of its own copy', () => {
    const { proxy, accessed } = countingProxy();
    setTypeScript(proxy);
    const code = "import Icon from './icon.svg?react';\n";
    const sf = ts.createSourceFile('a.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const ref = findAssetReferenceAt(sf, code.indexOf('Icon'));
    expect(ref?.physicalSpecifier).toBe('./icon.svg');
    expect(accessed.has('isImportDeclaration')).toBe(true);
  });

  it('plugin attachTypeScript injects tsserver typescript', () => {
    const { proxy } = countingProxy();
    attachTypeScript(proxy);
    expect(getTypeScript()).toBe(proxy);
  });
});
