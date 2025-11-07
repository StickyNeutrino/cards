#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to update the PWA manifest.json with build-specific information
 * This ensures the manifest always references the correct built assets
 *
 * Usage:
 * node update-manifest.js
 * or
 * npm run update-manifest (if added to package.json scripts)
 */

function updateManifest() {
  const manifestPath = path.join(__dirname, 'public', 'manifest.json');
  const buildDir = path.join(__dirname, 'build', 'client');
  const swPath = path.join(__dirname, 'public', 'service-worker.js');

  // Read current manifest
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Get build info from package.json
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

  // Update manifest with dynamic information
  manifest.version = packageJson.version || '1.0.0';
  manifest.description = packageJson.description || 'Flash Cards App';

  // Update last modified timestamp
  manifest.last_updated = new Date().toISOString();

  // Check if we have built assets and update service worker if needed
  if (fs.existsSync(buildDir)) {
    console.log('✓ Build directory exists');

    // Update service worker with current build assets
    updateServiceWorker(buildDir, swPath);
  } else {
    console.log('⚠ Build directory not found - run npm run build first');
  }

  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('✅ Manifest updated successfully!');
  console.log(`📦 Version: ${manifest.version}`);
  console.log(`🏷️  Name: ${manifest.name}`);
  console.log(`📝 Description: ${manifest.description}`);
  console.log(`🕒 Last Updated: ${manifest.last_updated}`);
}

function updateServiceWorker(buildDir, swPath) {
  try {
    // Read current service worker
    let swContent = fs.readFileSync(swPath, 'utf8');

    // Get list of assets in build directory
    const assets = fs.readdirSync(path.join(buildDir, 'assets'));

    // Filter for JS and CSS files
    const jsFiles = assets.filter(file => file.endsWith('.js'));
    const cssFiles = assets.filter(file => file.endsWith('.css'));

    // Update STATIC_ASSETS array in service worker
    const staticAssets = [
      '/',
      '/manifest.json',
      ...cssFiles.map(file => `/build/client/assets/${file}`),
      ...jsFiles.map(file => `/build/client/assets/${file}`),
      '/app/welcome/logo-dark.svg',
      '/app/welcome/logo-light.svg',
      '/arrow-left-solid-full.svg',
      '/arrow-right-solid-full.svg'
    ];

    // Replace the STATIC_ASSETS array in the service worker
    const staticAssetsRegex = /const STATIC_ASSETS = \[[\s\S]*?\];/;
    const newStaticAssets = `const STATIC_ASSETS = [
  ${staticAssets.map(asset => `'${asset}'`).join(',\n  ')}
];`;

    swContent = swContent.replace(staticAssetsRegex, newStaticAssets);

    // Write updated service worker
    fs.writeFileSync(swPath, swContent);

    console.log('✅ Service worker updated with current build assets');
    console.log(`📄 Found ${jsFiles.length} JS files and ${cssFiles.length} CSS files`);

  } catch (error) {
    console.warn('⚠ Failed to update service worker:', error.message);
  }
}

// Run the update if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateManifest();
}

export { updateManifest };