// Sync deck repositories into the app. Runs with plain `node` on any Node
// >= 23 (native TypeScript support), including the Node 26 Docker image.
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
//   node scripts/sync-decks.ts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const decksRoot = path.join(appRoot, "decks");
const publicDecksRoot = path.join(appRoot, "public", "decks");
const outDir = path.join(appRoot, "app", "data", "decks");

function copyTree(srcDir: string, destDir: string): number {
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
    const isData = manifest.cardFormat === "data";
    // Image decks ship pre-rendered card faces in cards/; data decks (Deck
    // Curator format) ship their referenced photos in photos/.
    const trees: Array<[string, string]> = []; // [srcDir, publicDir]
    const cardsDir = path.join(deckDir, "cards");
    if (fs.existsSync(cardsDir)) trees.push([cardsDir, path.join(publicDecksRoot, id, "cards")]);
    const photosDir = path.join(deckDir, "photos");
    if (fs.existsSync(photosDir)) trees.push([photosDir, path.join(publicDecksRoot, id, "photos")]);
    // Remove public copies of directories the deck no longer has (e.g. a
    // deck converted from the image format to the data format leaves its
    // rendered cards behind otherwise).
    for (const subdir of ["cards", "photos"]) {
      if (!trees.some(([, dest]) => dest.endsWith(`/${subdir}`))) {
        fs.rmSync(path.join(publicDecksRoot, id, subdir), { recursive: true, force: true });
      }
    }
    for (const [src, dest] of trees) totalCopied += copyTree(src, dest);

    // Every file a card references must exist in the deck repo, so the served
    // URLs point at real images. A manifest that drifted from the deck's files
    // (e.g. the legacy render stage overwriting the curated manifest, or bare
    // filenames without their cards/ prefix) would otherwise ship a deck of
    // broken images — fail the build loudly instead.
    const deckBroken: string[] = [];
    const requireDeckFile = (declared: unknown, what: string): void => {
      if (typeof declared !== "string" || declared === "") {
        deckBroken.push(`${what}: expected a deck-root-relative file path, got ${JSON.stringify(declared ?? null)}`);
        return;
      }
      const onDisk = path.join(publicDecksRoot, id, ...declared.split("/"));
      if (!fs.existsSync(onDisk)) {
        deckBroken.push(`${what}: "${declared}" — no such file (expected ${onDisk})`);
      }
    };
    for (const cat of manifest.categories ?? []) {
      for (const c of cat.cards ?? []) {
        if (isData) {
          (c.photos ?? []).forEach((p: any, i: number) => {
            if (typeof p.file === "string") requireDeckFile(p.file, `${c.name} photo ${i + 1}`);
            else if (!p.url) deckBroken.push(`${c.name} photo ${i + 1}: neither a file path nor a remote url`);
            if (typeof p.animation?.file === "string") requireDeckFile(p.animation.file, `${c.name} animation`);
          });
        } else {
          requireDeckFile(c.front, `${c.name} front`);
          requireDeckFile(c.back, `${c.name} back`);
        }
      }
    }
    if (deckBroken.length) {
      const shown = deckBroken.slice(0, 10);
      console.error(`Deck "${id}" has ${deckBroken.length} unresolvable card file(s):`);
      console.error(shown.map((line) => `  - ${line}`).join("\n"));
      if (deckBroken.length > shown.length) console.error(`  … and ${deckBroken.length - shown.length} more`);
      process.exit(1);
    }

    const resolveUrl = (file: string) =>
      `/decks/${id}/${file.split("/").map(encodeURIComponent).join("/")}`;
    const deckOut = {
      id: manifest.id ?? id,
      label: manifest.label ?? id,
      description: manifest.description ?? "",
      ...(manifest.location ? { location: manifest.location } : {}),
      ...(isData ? { cardFormat: "data" as const } : {}),
      categories: (manifest.categories ?? []).map((cat: any) => ({
        id: cat.id,
        label: cat.label,
        cards: cat.cards.map((c: any) => {
          const { canyons: _surveyData, ...card } = c;
          if (isData) {
            return {
              ...card,
              photos: (c.photos ?? []).map((p: any) => ({ ...p, file: resolveUrl(p.file) })),
            };
          }
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
    const cardCount = deckOut.categories.reduce((n: number, cat: any) => n + cat.cards.length, 0);
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
