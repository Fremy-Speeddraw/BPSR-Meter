/**
 * Development watch script
 * Watches for TypeScript changes and rebuilds automatically
 */

import chokidar from 'chokidar';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let isBuilding = false;
let buildQueued = false;

console.log('🔥 Starting development watch mode...\n');

// Initial build
await runBuild();

// Watch TypeScript files
const watcher = chokidar.watch([
    'src/**/*.ts',
    'electron-main.ts',
    'preload.ts',
    'server.ts'
], {
    ignored: /(^|[\/\\])\../,
    persistent: true
});

watcher
    .on('change', async (path) => {
        console.log(`\n📝 File changed: ${path}`);
        await debouncedBuild();
    })
    .on('ready', () => {
        console.log('👀 Watching for TypeScript changes...\n');
    });

// Watch asset files (copy without full rebuild)
const assetWatcher = chokidar.watch([
    'public/**/*',
    'tables/**/*',
    'algo/**/*.js',
    'translations/**/*',
    'diccionario.json',
    'settings.json',
    'player_map.json'
], {
    ignored: /(^|[\/\\])\../,
    persistent: true
});

assetWatcher
    .on('change', async (path) => {
        console.log(`\n📦 Asset changed: ${path}`);
        await copyAssets();
    });

async function runBuild() {
    if (isBuilding) {
        buildQueued = true;
        return;
    }

    isBuilding = true;
    console.log('🔨 Building TypeScript...');

    try {
        const startTime = Date.now();
        await execAsync('npx tsc');
        await copyAssets();
        const duration = Date.now() - startTime;
        console.log(`✅ Build completed in ${duration}ms\n`);
    } catch (error) {
        console.error('❌ Build failed:', error.message);
    } finally {
        isBuilding = false;
        
        if (buildQueued) {
            buildQueued = false;
            await runBuild();
        }
    }
}

async function copyAssets() {
    try {
        await execAsync('node build-copy-assets.js');
    } catch (error) {
        console.error('❌ Asset copy failed:', error.message);
    }
}

async function debouncedBuild() {
    if (isBuilding) {
        buildQueued = true;
        return;
    }
    
    // Small debounce to avoid multiple rapid builds
    await new Promise(resolve => setTimeout(resolve, 100));
    await runBuild();
}

// Handle cleanup
process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping watch mode...');
    watcher.close();
    assetWatcher.close();
    process.exit(0);
});
