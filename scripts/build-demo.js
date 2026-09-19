import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const demoDir = path.join(rootDir, 'demo');
const indexPath = path.join(demoDir, 'index.html');
const cssPath = path.join(demoDir, 'css', 'style.css');
const appJsPath = path.join(demoDir, 'js', 'app.js');

async function build() {
  console.log('Bundling demo JavaScript with esbuild...');
  const result = await esbuild.build({
    entryPoints: [appJsPath],
    bundle: true,
    format: 'iife',
    write: false,
    target: ['es2020'],
  });

  const bundledJs = result.outputFiles[0].text;

  console.log('Reading and processing demo CSS...');
  let css = fs.readFileSync(cssPath, 'utf-8');
  // In demo/css/style.css, images are referenced as ../images/...
  // When inlined into demo/index.html, they must be images/...
  css = css.replace(/\.\.\/images\//g, 'images/');

  console.log('Reading demo/index.html...');
  let html = fs.readFileSync(indexPath, 'utf-8');

  // Replace CSS link or existing inline CSS
  const cssInlineBlock = `<!-- INLINE_CSS_START -->\n  <style>\n${css}\n  </style>\n  <!-- INLINE_CSS_END -->`;
  if (html.includes('<!-- INLINE_CSS_START -->')) {
    html = html.replace(
      /<!-- INLINE_CSS_START -->[\s\S]*?<!-- INLINE_CSS_END -->/,
      cssInlineBlock
    );
  } else {
    html = html.replace(/<link\s+rel="stylesheet"\s+href="css\/style\.css"\s*\/?>/i, cssInlineBlock);
  }

  // Replace JS script or existing inline JS
  const jsInlineBlock = `<!-- INLINE_JS_START -->\n  <script>\n${bundledJs}\n  </script>\n  <!-- INLINE_JS_END -->`;
  if (html.includes('<!-- INLINE_JS_START -->')) {
    html = html.replace(
      /<!-- INLINE_JS_START -->[\s\S]*?<!-- INLINE_JS_END -->/,
      jsInlineBlock
    );
  } else {
    html = html.replace(/<script\s+type="module"\s+src="js\/app\.js">\s*<\/script>/i, jsInlineBlock);
  }

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log(`Successfully built standalone demo at: ${indexPath} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
}

build().catch((err) => {
  console.error('Demo build failed:', err);
  process.exit(1);
});
