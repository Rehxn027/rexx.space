# Vendored libraries

`anthropic-sdk.js` is the official [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) (`@anthropic-ai/sdk` 1.12.0, Apache-2.0 licence in `anthropic-sdk.LICENSE`), bundled as one browser ES module so the app keeps its no-build-step setup. It is loaded only when someone opens the Ask page.

To update it:

```bash
npm i @anthropic-ai/sdk esbuild
echo "export { default } from '@anthropic-ai/sdk';" > entry.js
npx esbuild entry.js --bundle --format=esm --platform=browser --minify --legal-comments=eof --outfile=js/vendor/anthropic-sdk.js
```
