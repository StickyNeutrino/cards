// Sync deck repositories into the app. Plain JS (no build step) so the
// prebuild/predev hooks run on any Node >= 20, including the Docker image.
//
// Each directory under decks/<id>/ is a standalone deck repository containing
// manifest.json (card metadata, portable bare filenames) and cards/*.jpg.
// This script:
//   1. copies each deck's card images into public/decks/<id>/cards/
//   2. resolves filenames into served URLs
//   3. writes app/data/decks/<id>.json — one manifest per deck, with the
//      survey-specific data (per-canyon species records) stripped; the full
//      manifest stays in the private deck repository only
//
// Run automatically before `dev` and `build`; also runnable directly:
//   node scripts/sync-decks.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const decksRoot = path.join(appRoot, "decks");
const publicDecksRoot = path.join(appRoot, "public", "decks");
const outDir = path.join(appRoot, "app", "data", "decks");

function copyTree(srcDir, destDir) {
  let copied = 0;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copied += copyTree(src, dest);
    } else {
      const srcStat = fs.statSync(src);
      const needsCopy =
        !fs.existsSync(dest) ||
        fs.statSync(dest).size !== srcStat.size ||
        fs.statSync(dest).mtimeMs < srcStat.mtimeMs;
      if (needsCopy) {
        fs.copyFileSync(src, dest);
        fs.utimesSync(dest, srcStat.atime, srcStat.mtime);
        copied++;
      }
    }
  }
  return copied;
}

function main() {
  if (!fs.existsSync(decksRoot)) {
    console.error(`No decks/ directory found at ${decksRoot}. Clone deck repositories there first.`);
    process.exit(1);
  }
  const deckIds = fs
    .readdirSync(decksRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();

  if (deckIds.length === 0) {
    console.error(`No deck repositories found in ${decksRoot}.`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const written = new Set();
  let totalCopied = 0;

  for (const id of deckIds) {
    const deckDir = path.join(decksRoot, id);
    const manifestPath = path.join(deckDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      console.error(`Deck "${id}" has no manifest.json — skipping. (${manifestPath})`);
      continue;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const cardsDir = path.join(deckDir, "cards");
    if (fs.existsSync(cardsDir)) {
      totalCopied += copyTree(cardsDir, path.join(publicDecksRoot, id, "cards"));
    } else {
      console.warn(`Deck "${id}" has no cards/ directory — manifest only.`);
    }

    const resolveUrl = (file) => `/decks/${id}/cards/${file.split("/").map(encodeURIComponent).join("/")}`;
    const deckOut = {
      id: manifest.id ?? id,
      label: manifest.label ?? id,
      description: manifest.description ?? "",
      categories: (manifest.categories ?? []).map((cat) => ({
        id: cat.id,
        label: cat.label,
        cards: cat.cards.map((c) => {
          const { canyons: _surveyData, ...card } = c;
          return {
            ...card,
            front: resolveUrl(c.front),
            back: resolveUrl(c.back),
          };
        }),
      })),
    };
    const outPath = path.join(appRoot, "app", "data", "decks", `${id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(deckOut, null, 2) + "\n");
    written.add(id);
    const cardCount = deckOut.categories.reduce((n, cat) => n + cat.cards.length, 0);
    console.log(`  ${deckOut.id}: ${cardCount} cards`);
  }

  // Remove stale per-deck manifests for decks that no longer exist.
  for (const entry of fs.readdirSync(path.join(appRoot, "app", "data", "decks"))) {
    if (!written.has(entry.replace(/\.json$/, ""))) {
      fs.rmSync(path.join(appRoot, "app", "data", "decks", entry));
      console.log(`  removed stale ${entry}`);
    }
  }

  console.log(`Copied ${totalCopied} image(s); wrote ${written.size} deck manifest(s)`);
}

main();
