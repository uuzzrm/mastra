---
'@mastra/core': patch
---

File uploads now keep the filename supplied by the provider (e.g. Gemini) and fall back to `generated.<ext>` when none is provided.
