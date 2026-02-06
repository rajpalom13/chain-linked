import { existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure dist directories exist
const dirs = ['dist', 'dist/background', 'dist/content', 'dist/icons', 'dist/popup', 'dist/lib', 'dist/lib/supabase'];
dirs.forEach(dir => {
  const path = resolve(__dirname, dir);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
});

// Build TypeScript service worker
async function buildServiceWorker() {
  console.log('[Build] Building TypeScript service worker...');

  try {
    await build({
      entryPoints: [resolve(__dirname, 'src/background/service-worker.ts')],
      bundle: true,
      outfile: resolve(__dirname, 'dist/background/service-worker.js'),
      format: 'iife',
      target: 'es2020',
      platform: 'browser',
      sourcemap: true,
      minify: false,
      external: [],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });
    console.log('  - Built: background/service-worker.js');
  } catch (error) {
    console.error('[Build] Service worker build failed:', error);
    throw error;
  }
}

// Build TypeScript content scripts
async function buildContentScripts() {
  console.log('[Build] Building TypeScript content scripts...');

  const contentScripts = [
    { entry: 'auto-capture.ts', out: 'auto-capture.js' },
    { entry: 'dom-extractor.ts', out: 'dom-extractor.js' },
    { entry: 'content-script.ts', out: 'content-script.js' },
    { entry: 'company-extractor.ts', out: 'company-extractor.js' },
    { entry: 'main-world-interceptor.ts', out: 'main-world-interceptor.js' },
  ];

  for (const script of contentScripts) {
    const srcPath = resolve(__dirname, 'src/content', script.entry);
    if (existsSync(srcPath)) {
      try {
        await build({
          entryPoints: [srcPath],
          bundle: true,
          outfile: resolve(__dirname, 'dist/content', script.out),
          format: 'iife',
          target: 'es2020',
          platform: 'browser',
          sourcemap: true,
          minify: false,
        });
        console.log(`  - Built: content/${script.out}`);
      } catch (error) {
        console.error(`[Build] Failed to build ${script.entry}:`, error);
        // Fall back to copying JS file if TS build fails
        const jsSrcPath = resolve(__dirname, 'content', script.out);
        if (existsSync(jsSrcPath)) {
          copyFileSync(jsSrcPath, resolve(__dirname, 'dist/content', script.out));
          console.log(`  - Copied fallback: content/${script.out}`);
        }
      }
    }
  }
}

// Copy all static files
function copyStaticFiles() {
  console.log('[Build] Copying static files...');

  // Copy manifest.json
  const manifestPath = resolve(__dirname, 'manifest.json');
  const manifestContent = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  writeFileSync(
    resolve(__dirname, 'dist/manifest.json'),
    JSON.stringify(manifestContent, null, 2)
  );
  console.log('  - Copied: manifest.json');

  // Copy icons
  const iconsDir = resolve(__dirname, 'icons');
  if (existsSync(iconsDir)) {
    readdirSync(iconsDir).forEach(file => {
      if (file.endsWith('.png') || file.endsWith('.svg')) {
        copyFileSync(
          resolve(iconsDir, file),
          resolve(__dirname, 'dist/icons', file)
        );
      }
    });
    console.log('  - Copied: icons/');
  }

  // Copy lib/supabase JavaScript files
  const libSupabaseDir = resolve(__dirname, 'lib/supabase');
  if (existsSync(libSupabaseDir)) {
    readdirSync(libSupabaseDir).forEach(file => {
      if (file.endsWith('.js')) {
        copyFileSync(
          resolve(libSupabaseDir, file),
          resolve(__dirname, 'dist/lib/supabase', file)
        );
      }
    });
    console.log('  - Copied: lib/supabase/');
  }

  // Copy content scripts that don't have TypeScript versions
  const contentDir = resolve(__dirname, 'content');
  const contentFilesToCopy = [
    'injected.js',
    'styles.css',
  ];
  contentFilesToCopy.forEach(file => {
    const srcPath = resolve(contentDir, file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, resolve(__dirname, 'dist/content', file));
      console.log(`  - Copied: content/${file}`);
    }
  });

  // Copy index.html → popup.html (manifest references popup/popup.html)
  const popupIndexPath = resolve(__dirname, 'dist/popup/index.html');
  const popupHtmlPath = resolve(__dirname, 'dist/popup/popup.html');
  if (existsSync(popupIndexPath)) {
    let popupHtml = readFileSync(popupIndexPath, 'utf-8');
    // Ensure relative paths (Vite may output absolute or relative depending on base config)
    popupHtml = popupHtml.replace(/src="\/popup\.js"/g, 'src="./popup.js"');
    popupHtml = popupHtml.replace(/href="\/popup\.css"/g, 'href="./popup.css"');
    writeFileSync(popupHtmlPath, popupHtml);
    console.log('  - Fixed: popup.html paths (copied from index.html)');
  } else {
    console.warn('  - WARNING: dist/popup/index.html not found! Run "npm run build:popup" first.');
  }

  console.log('[Build] Static files copied successfully');
}

// Main build function
async function runBuild() {
  try {
    // Build TypeScript service worker
    await buildServiceWorker();

    // Build TypeScript content scripts
    await buildContentScripts();

    // Copy static files
    copyStaticFiles();

    console.log('\n[Build] Complete!');
    console.log('  Run "npm run build:popup" to build the React popup');
    console.log('  Then load dist/ as unpacked extension in Chrome');
  } catch (error) {
    console.error('[Build] Build failed:', error);
    process.exit(1);
  }
}

// Run the build
runBuild();
