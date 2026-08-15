import { RESOURCE_URI_META_KEY } from '@modelcontextprotocol/ext-apps';

const MASTRA_META_KEY = 'mastra';
const STRICT_META_KEY = 'strict';

export function withMastraToolStrictMeta(
  meta: Record<string, unknown> | undefined,
  strict: boolean | undefined,
): Record<string, unknown> | undefined {
  if (strict == null) {
    return meta;
  }

  const mastraMeta =
    meta?.[MASTRA_META_KEY] && typeof meta[MASTRA_META_KEY] === 'object'
      ? (meta[MASTRA_META_KEY] as Record<string, unknown>)
      : undefined;

  return {
    ...(meta ?? {}),
    [MASTRA_META_KEY]: {
      ...(mastraMeta ?? {}),
      [STRICT_META_KEY]: strict,
    },
  };
}

/**
 * Mirrors the MCP Apps resource URI between the nested `ui.resourceUri` key and
 * the legacy flat `RESOURCE_URI_META_KEY` (`ui/resourceUri`) key, filling in
 * whichever is missing so a single `_meta` object works with both host
 * generations. Keeps `tools/list` and `tools/call` results consistent.
 */
export function normalizeResourceUriMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const uiMeta = meta.ui as { resourceUri?: string } | undefined;
  const legacyUri = meta[RESOURCE_URI_META_KEY] as string | undefined;
  if (uiMeta?.resourceUri && !legacyUri) {
    return { ...meta, [RESOURCE_URI_META_KEY]: uiMeta.resourceUri };
  }
  if (legacyUri && !uiMeta?.resourceUri) {
    return { ...meta, ui: { ...((meta.ui as object) ?? {}), resourceUri: legacyUri } };
  }
  return meta;
}

export function getMastraToolStrictMeta(meta: Record<string, unknown> | undefined): boolean | undefined {
  const mastraMeta = meta?.[MASTRA_META_KEY];
  if (!mastraMeta || typeof mastraMeta !== 'object') {
    return undefined;
  }

  const strict = (mastraMeta as Record<string, unknown>)[STRICT_META_KEY];
  return typeof strict === 'boolean' ? strict : undefined;
}
