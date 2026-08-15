---
'@mastra/mcp': patch
---

Fixed `MCPServer` dropping `_meta` from `tools/call` results. A tool declared with `_meta.ui.resourceUri` (MCP Apps) now echoes that URI on its call result, alongside the legacy flat `ui/resourceUri` key, matching what `tools/list` already advertises. That lets any MCP host — not just Mastra Studio — detect and render the associated app from the tool-call result. Author-returned `_meta` from `execute()` is preserved and takes precedence over the declared value. The nested/flat resource-URI normalization is now shared between `tools/list` and `tools/call`.
