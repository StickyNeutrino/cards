import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from '../../app/utils/uploadedDecks';

/**
 * Contract tests for the built-in deck repositories under decks/. The
 * healthy-canyons deck is generated (generation/curate.ts) and doubles as a
 * Deck Curator archive (docs/DECK_FORMAT.md); these tests keep its
 * manifest.json loadable by the app's own upload validator and its photo
 * files, crops and credits consistent, so a regeneration can never silently
 * ship a deck the app would refuse to import.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const deckDir = path.join(repoRoot, 'decks', 'healthy-canyons');
const manifestPath = path.join(deckDir, 'manifest.json');

/** Card slot aspects from the renderer geometry (app/card/dataCard.tsx). */
const SLOT_ASPECTS = {
  main: 650 / 604,
  secondaryLeft: 276 / 295,
  secondaryRight: 324 / 295,
} as const;

/** Width/height of a baseline JPEG by scanning for its SOF marker. The deck
 *  photos are all JPEGs; crop windows are defined over the stored pixels, so
 *  their aspect invariant needs the real dimensions. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const length = buf.readUInt16BE(i + 2);
    if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

describe('healthy-canyons deck repository', () => {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  it('passes the app\'s deck-archive manifest validation', () => {
    // validateManifest throws DeckImportError on the first structural
    // problem (ids, cardFormat, unique card names, photo roles/credits,
    // licenses…) — the same rules the Manage Decks upload enforces.
    expect(() => validateManifest(raw)).not.toThrow();
  });

  it('is a data-format deck with plants and animals categories', () => {
    expect(raw.cardFormat).toBe('data');
    expect(raw.id).toBe('healthy-canyons');
    expect(raw.categories.map((c: { id: string }) => c.id)).toEqual(['plants', 'animals']);
    const cards = raw.categories.flatMap((c: { cards: unknown[] }) => c.cards);
    expect(cards.length).toBeGreaterThan(1000);
  });

  it('references photo files that exist in photos/', () => {
    const cards = raw.categories.flatMap((c: { cards: unknown[] }) => c.cards);
    const missing: string[] = [];
    for (const card of cards) {
      for (const photo of card.photos ?? []) {
        const file = path.join(deckDir, photo.file.replace(/^\//, ''));
        if (!fs.existsSync(file)) missing.push(`${card.name}: ${photo.file}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('gives every card a leading main photo, matched credits, and valid crops', () => {
    const cards = raw.categories.flatMap((c: { cards: unknown[] }) => c.cards);
    const problems: string[] = [];
    for (const card of cards) {
      const photos = card.photos ?? [];
      if (!photos.length) problems.push(`${card.name}: no photos`);
      if (photos[0]?.role !== 'main') problems.push(`${card.name}: first photo is not the main`);
      if (photos.filter((p: { role: string }) => p.role === 'main').length !== 1) {
        problems.push(`${card.name}: not exactly one main photo`);
      }
      if ((card.credits?.length ?? 0) !== photos.length) {
        problems.push(`${card.name}: ${photos.length} photos but ${card.credits?.length ?? 0} credits`);
      }
      photos.forEach((p: { file: string; crop?: { x: number; y: number; w: number; h: number } }, i: number) => {
        if (!p.crop) return; // no crop = automatic centered cover
        const { x, y, w, h } = p.crop;
        for (const v of [x, y, w, h]) {
          if (typeof v !== 'number' || v < 0 || v > 1) problems.push(`${card.name} photo ${i + 1}: crop value out of range`);
        }
        if (x + w > 1.001 || y + h > 1.001) problems.push(`${card.name} photo ${i + 1}: crop window exceeds the photo`);
        // The crop window maps onto its slot exactly (object-fit: fill), so
        // the crop REGION's pixel aspect must equal the slot's aspect or the
        // photo renders distorted. The normalized window alone doesn't carry
        // this — it depends on the source image's own aspect.
        const slotAspect = i === 0 ? SLOT_ASPECTS.main : photos.length === 2 ? SLOT_ASPECTS.secondaryRight : i === 1 ? SLOT_ASPECTS.secondaryLeft : SLOT_ASPECTS.secondaryRight;
        const file = path.join(deckDir, p.file.replace(/^\//, ''));
        const dims = jpegSize(fs.readFileSync(file));
        if (!dims) problems.push(`${card.name} photo ${i + 1}: unreadable JPEG`);
        else {
          const cropAspect = (w * dims.width) / (h * dims.height);
          if (Math.abs(cropAspect - slotAspect) / slotAspect > 0.03) {
            problems.push(`${card.name} photo ${i + 1}: crop region aspect ${cropAspect.toFixed(3)} ≠ slot aspect ${slotAspect.toFixed(3)}`);
          }
        }
      });
    }
    expect(problems).toEqual([]);
  });

  it('credits every photo with observer and an allowed license', () => {
    const cards = raw.categories.flatMap((c: { cards: unknown[] }) => c.cards);
    const problems: string[] = [];
    for (const card of cards) {
      for (const photo of card.photos ?? []) {
        const credit = photo.credit ?? {};
        if (!credit.observer) problems.push(`${card.name}: photo without observer`);
        if (!/^(cc0|cc-by(-sa|-nc(-sa|-nd)?|-nd)?|all-rights-reserved)$/.test(credit.license ?? '')) {
          problems.push(`${card.name}: photo license "${credit.license}" is not allowed`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
