// The `~assets` alias exists only here, which TypeScript cannot see. The extension never
// executes this file; the alias is mirrored in .vscode/settings.json instead.
import { fileURLToPath, URL } from 'node:url';

export default {
  resolve: {
    alias: { '~assets': fileURLToPath(new URL('./src/assets', import.meta.url)) },
  },
};
