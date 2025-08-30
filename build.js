const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension-web.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  minify: !isWatch,
  define: {
    'process.env.NODE_ENV': JSON.stringify(isWatch ? 'development' : 'production')
  }
};

const webviewConfig = {
  entryPoints: ['src/ui/webview/main.tsx'],
  bundle: true,
  outfile: 'dist/webview/main.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  minify: !isWatch,
  define: {
    'process.env.NODE_ENV': JSON.stringify(isWatch ? 'development' : 'production')
  },
  jsx: 'automatic',
  jsxImportSource: 'preact'
};

const cssConfig = {
  entryPoints: ['src/ui/webview/styles/main.css'],
  bundle: true,
  outfile: 'dist/webview/styles.css',
  minify: !isWatch,
  sourcemap: true
};

async function build() {
  try {
    console.log('Building extension...');
    
    if (isWatch) {
      console.log('Starting watch mode...');
      
      const extensionContext = await esbuild.context(extensionConfig);
      const webviewContext = await esbuild.context(webviewConfig);
      const cssContext = await esbuild.context(cssConfig);
      
      await Promise.all([
        extensionContext.watch(),
        webviewContext.watch(),
        cssContext.watch()
      ]);
      
      console.log('Watching for changes...');
    } else {
      await Promise.all([
        esbuild.build(extensionConfig),
        esbuild.build(webviewConfig),
        esbuild.build(cssConfig)
      ]);
      
      console.log('Build completed successfully!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
