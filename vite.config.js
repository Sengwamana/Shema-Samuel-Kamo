import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function copyStaticAssets() {
  return {
    name: 'copy-static-assets',
    closeBundle() {
      const dirs = ['js', 'media', 'fonts', 'css'];
      const files = ['robots.txt', 'sitemap.xml', 'site.webmanifest', 'favicon.ico'];
      for (const dir of dirs) {
        if (fs.existsSync(dir)) {
          fs.cpSync(dir, path.join('dist', dir), { recursive: true, force: true });
        }
      }
      for (const file of files) {
        if (fs.existsSync(file)) {
          fs.copyFileSync(file, path.join('dist', file));
        }
      }
      console.log('✓ Successfully copied static assets (js, media, fonts, manifests) to dist/');
    },
  };
}

export default defineConfig({
  plugins: [copyStaticAssets()],
  server: {
    port: 3000,
    open: false,
  },
});
