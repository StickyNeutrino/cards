import { useLayoutEffect, useRef } from 'react';
import type { PhotoCredit } from '~/data/decks';

/**
 * HTML renderer for data-driven cards (deck manifest cardFormat "data"), per
 * docs/DECK_FORMAT.md: a 750×1050 canvas with background #e4e3df, photo slots
 * at fixed geometry, and a Healthy Canyons-style text stack on the back. The
 * canvas is drawn at its fitted size inside the flip-card (container-query
 * units keep every measurement proportional to the 750px design width), so it
 * behaves like the pre-rendered JPGs it replaces.
 *
 * A photo credit line is "© Observer · LICENSE" — the same format the
 * Healthy Canyons pipeline bakes into its rendered fronts.
 */

export interface DataCardPhoto {
  /** Resolved URL for the photo (blob: for uploaded decks). */
  src: string;
  role: 'main' | 'secondary';
  alt?: string;
  credit: PhotoCredit;
  /** Focal point (0..1) for cover-cropping non-square photos; default center. */
  focus?: { x: number; y: number };
}

export interface DataCardModel {
  name: string;
  /** Clean species name for the back title — variant cards export unique
   *  names ("Name (2)") but should still show the plain common name. */
  commonName?: string;
  layout?: 'photo-trio' | 'photo-single';
  photos?: DataCardPhoto[];
  altNames?: string[];
  sciName?: string;
  familyCommon?: string;
  familyLatin?: string;
  native?: 'native' | 'non-native' | 'unknown';
  rarity?: string | null;
  invasive?: boolean;
}

interface DataCardProps {
  model: DataCardModel;
  /** Which face of the flip-card to draw. */
  face: 'front' | 'back';
  /** Back only: draw the red invasive border around the canvas. */
  invasive?: boolean;
  /** Back only: receives the canvas element so the button row can match its width. */
  widthRef?: React.Ref<HTMLDivElement | null>;
}

/** Slot geometry as percentages of the 750×1050 canvas (50/750, 48/1050, …). */
const MAIN_SLOT = { left: '6.6667%', top: '4.5714%', width: '86.6667%', height: '57.5238%' } as const;
const SECONDARY_SLOTS = [
  { left: '6.6667%', top: '66.8571%', width: '36.8%', height: '28.0952%' },
  { left: '50.1333%', top: '66.8571%', width: '43.2%', height: '28.0952%' },
] as const;

/** Max (72px) and floor for the auto-shrinking back title, in em of the 12px
 *  design font size (so 6em = 72px on the 750px canvas). */
const TITLE_MAX_EM = 6;
const TITLE_MIN_EM = 2.5;
const TITLE_STEP_EM = 0.25;

export function creditLabelFor(license: string): string {
  if (license.toLowerCase() === 'cc0') return 'CC0';
  if (license.toLowerCase() === 'all-rights-reserved') return 'All Rights Reserved';
  return license.toUpperCase().replace(/^CC-/, 'CC ');
}

function nativeStatusFor(model: DataCardModel): string | null {
  // Invasive species are flagged by the red border, but the Healthy Canyons
  // backs also spell it out in the native-status line.
  if (model.native === 'non-native' && model.invasive) return 'Non-native (Invasive)';
  switch (model.native) {
    case 'native': return 'Native';
    case 'non-native': return 'Non-native';
    case 'unknown': return 'Unknown';
    default: return null;
  }
}

function captionFor(photo: DataCardPhoto): string {
  return `© ${photo.credit.observer} · ${creditLabelFor(photo.credit.license)}`;
}

/** object-position for a photo's focal point (default: centered). */
function focusStyle(focus?: { x: number; y: number }): React.CSSProperties | undefined {
  if (!focus) return undefined;
  const x = Math.min(1, Math.max(0, focus.x)) * 100;
  const y = Math.min(1, Math.max(0, focus.y)) * 100;
  return { objectPosition: `${x}% ${y}%` };
}

/** Front: the photo grid. One photo = main only; two = main + first
 *  secondary; three = the full trio — identical for trio and single layouts. */
function CardFront({ model }: { model: DataCardModel }) {
  const photos = model.photos ?? [];
  const main = photos[0];
  const secondaries = photos.slice(1, 3);
  return (
    <div className="data-card" data-testid="data-card-front">
      <div className="data-card-content">
        {main && (
          <figure className="data-photo" style={{ ...MAIN_SLOT }} data-testid="data-photo" data-role="main">
            <img src={main.src} alt={main.alt ?? model.name} style={focusStyle(main.focus)} />
            <figcaption className="data-credit" data-testid="data-credit">{captionFor(main)}</figcaption>
          </figure>
        )}
        {secondaries.map((photo, index) => (
          <figure
            key={index}
            className="data-photo"
            style={{ ...SECONDARY_SLOTS[index] }}
            data-testid="data-photo"
            data-role="secondary"
          >
            <img src={photo.src} alt={photo.alt ?? `${model.name} photo ${index + 2}`} style={focusStyle(photo.focus)} />
            <figcaption className="data-credit" data-testid="data-credit">{captionFor(photo)}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/** Back: the Healthy Canyons text stack — title (auto-shrunk to fit), aka
 *  line, scientific name, family, native status, rarity — centered on the
 *  canvas, with the white logo chip at the top-left. */
function CardBack({ model, invasive, widthRef }: { model: DataCardModel; invasive: boolean; widthRef?: React.Ref<HTMLDivElement | null> }) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  // Auto-shrink the title until it fits the canvas width. Runs after every
  // render (cheap once converged) so a re-render can never leave a stale size.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    let size = TITLE_MAX_EM;
    el.style.fontSize = `${size}em`;
    // 1px slack for fractional-pixel rounding.
    while (size > TITLE_MIN_EM && el.scrollWidth > el.clientWidth + 1) {
      size -= TITLE_STEP_EM;
      el.style.fontSize = `${size}em`;
    }
  });

  const nativeStatus = nativeStatusFor(model);
  return (
    <div className={`data-card ${invasive ? 'invasive' : ''}`} data-testid="data-card-back" ref={widthRef}>
      <div className="data-card-content">
        <div className="data-logo-chip" aria-hidden="true" />
        <div className="data-back-stack">
          <h2 className="data-back-title" data-testid="data-card-title" ref={titleRef}>{model.commonName ?? model.name}</h2>
          {model.altNames && model.altNames.length > 0 && (
            <div className="data-back-alt" data-testid="data-card-alt-names">
              aka {model.altNames.join(', ')}
            </div>
          )}
          {model.sciName && <div className="data-back-sci" data-testid="data-card-sci-name">{model.sciName}</div>}
          {model.familyCommon && <div className="data-back-family" data-testid="data-card-family-common">{model.familyCommon}</div>}
          {model.familyLatin && <div className="data-back-family-latin" data-testid="data-card-family-latin">{model.familyLatin}</div>}
          {nativeStatus && <div className="data-back-native" data-testid="data-card-native">{nativeStatus}</div>}
          {model.rarity && <div className="data-back-rarity" data-testid="data-card-rarity">{model.rarity}</div>}
        </div>
      </div>
    </div>
  );
}

export function DataCard({ model, face, invasive = false, widthRef }: DataCardProps) {
  if (face === 'front') return <CardFront model={model} />;
  return <CardBack model={model} invasive={invasive} widthRef={widthRef} />;
}
