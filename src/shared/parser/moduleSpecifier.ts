export interface ParsedModuleSpecifier {
  physicalSpecifier: string;
  query: string | null;
  hash: string | null;
}

const SPECIFIER_PARTS = /^([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/;

/**
 * Split a raw module specifier into physical path, query, and hash.
 * Regex is used only for this narrow split (not for import detection).
 */
export function parseModuleSpecifier(raw: string): ParsedModuleSpecifier {
  const match = SPECIFIER_PARTS.exec(raw);
  if (!match) {
    return { physicalSpecifier: raw, query: null, hash: null };
  }

  const physicalSpecifier = match[1] ?? '';
  const queryPart = match[2];
  const hashPart = match[3];

  return {
    physicalSpecifier,
    query: queryPart !== undefined && queryPart !== '' ? queryPart : null,
    hash: hashPart !== undefined && hashPart !== '' ? hashPart : null,
  };
}
