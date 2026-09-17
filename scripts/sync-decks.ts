import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Sync deck repositories into the app.
 *
 * Each directory under decks/<id>/ is a standalone deck repository containing
 * manifest.json (card metadata, portable bare filenames) and cards/*.jpg.
 * This script:
 *   1. copies each deck's card images into public/decks/<id>/cards/
 *   2. resolves filenames into served URLs
 *   3. writes app/data/decks.json — the registry the app is built from
 *
 * Run automatically before `dev` and `build`; also runnable directly:
 *   node scripts/sync-decks.ts
 */

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const decksRoot = path.join(appRoot, "decks");
const publicDecksRoot = path.join(appRoot, "public", "decks");
const outFile = path.join(appRoot, "app", "data", "decks.json");

interface CardJson {
  name: string;
  front: string;
  back: string;
  invasive: boolean;
  [key: string]: unknown;
}

interface CategoryJson {
  id: string;
  label: string;
  cards: CardJson[];
}

interface DeckJson {
  id: string;
  label: string;
  description?: string;
  categories: CategoryJson[];
}

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

function main(): void {
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

  const decksOut: Array<Record<string, unknown>> = [];
  let totalCopied = 0;

  for (const id of deckIds) {
    const deckDir = path.join(decksRoot, id);
    const manifestPath = path.join(deckDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      console.error(`Deck "${id}" has no manifest.json — skipping. (${manifestPath})`);
      continue;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as DeckJson;
    const cardsDir = path.join(deckDir, "cards");
    if (fs.existsSync(cardsDir)) {
      totalCopied += copyTree(cardsDir, path.join(publicDecksRoot, id, "cards"));
    } else {
      console.warn(`Deck "${id}" has no cards/ directory — manifest only.`);
    }

    const resolveUrl = (file: string) => `/decks/${id}/cards/${file.split("/").map(encodeURIComponent).join("/")}`;
    decksOut.push({
      id: manifest.id ?? id,
      label: manifest.label ?? id,
      description: manifest.description ?? "",
      categories: (manifest.categories ?? []).map((cat) => ({
        id: cat.id,
        label: cat.label,
        cards: cat.cards.map((c) => ({
          ...c,
          front: resolveUrl(c.front),
          back: resolveUrl(c.back),
        })),
      })),
    });
    const cardCount = (manifest.categories ?? []).reduce((n, cat) => n + cat.cards.length, 0);
    console.log(`  ${manifest.id ?? id}: ${cardCount} cards`);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  // No timestamp: sync must be idempotent so rebuilds don't dirty the file.
  fs.writeFileSync(
    outFile,
    JSON.stringify({ decks: decksOut }, null, 2) + "\n",
  );
  console.log(`Copied ${totalCopied} image(s); wrote ${outFile}`);
}

main();