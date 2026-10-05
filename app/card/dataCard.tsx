import { useLayoutEffect, useRef, useState } from 'react';
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
  /** Explicit crop window (normalized 0..1) over the source photo — maps
   *  exactly onto the slot. Takes precedence over focus. */
  crop?: { x: number; y: number; w: number; h: number };
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
  /** Colored border tag; 'invasive' uses the classic red class, the others
   *  render with their border color inline. */
  border?: 'invasive' | 'caution' | 'rare' | 'notable';
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

/**
 * Style that maps an explicit crop window (normalized 0..1 source rect,
 * DECK_FORMAT.md `photos[].crop`) exactly onto the slot: the img is scaled so
 * the crop region fills the slot and the figure's overflow:hidden clips the
 * rest. Takes precedence over the legacy focal point.
 */
function cropStyle(crop: { x: number; y: number; w: number; h: number }): React.CSSProperties {
  const w = Math.min(1, Math.max(0.05, crop.w));
  const h = Math.min(1, Math.max(0.05, crop.h));
  const x = Math.min(1 - w, Math.max(0, crop.x));
  const y = Math.min(1 - h, Math.max(0, crop.y));
  return {
    position: "absolute",
    width: `${100 / w}%`,
    height: `${100 / h}%`,
    left: `${(-x / w) * 100}%`,
    top: `${(-y / h) * 100}%`,
    objectFit: "fill",
    // The slot CSS clamps imgs to 100% — that would shrink the oversized
    // crop window and re-crop the crop. Explicitly unclamp.
    maxWidth: "none",
    maxHeight: "none",
  };
}

/** The <img> for a photo with whatever crop treatment it declares. The CSS
 *  gives imgs width/height 100% + object-fit cover (the default cover crop);
 *  an explicit crop overrides via inline styles (they win over the CSS), and
 *  a legacy focal point just shifts the cover position. A photo whose bytes
 *  can't be loaded (offline with a light deck's photo not yet cached, or a
 *  dead remote URL) renders as a quiet placeholder instead of a broken image. */
function Photo({ photo, alt }: { photo: DataCardPhoto; alt: string }) {
  const [failed, setFailed] = useState(false);
  // A new src (e.g. the photo was just cached locally and the deck swapped
  // to its blob: URL) deserves a fresh try.
  const [lastSrc, setLastSrc] = useState(photo.src);
  if (lastSrc !== photo.src) {
    setLastSrc(photo.src);
    setFailed(false);
  }
  if (failed) {
    return (
      <div className="data-photo-missing" data-testid="photo-missing" role="img" aria-label={alt}>
        Photo unavailable
      </div>
    );
  }
  const onError = () => setFailed(true);
  if (photo.crop) {
    return <img src={photo.src} alt={alt} style={cropStyle(photo.crop)} onError={onError} />;
  }
  return <img src={photo.src} alt={alt} style={focusStyle(photo.focus)} onError={onError} />;
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
            {/* The viewport clips oversized crop windows; the caption stays
                outside it so credits render under the photo. */}
            <div className="data-photo-viewport">
              <Photo photo={main} alt={main.alt ?? model.name} />
            </div>
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
            <div className="data-photo-viewport">
              <Photo photo={photo} alt={photo.alt ?? `${model.name} photo ${index + 2}`} />
            </div>
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
  // The .invasive class supplies width/style; other colors need them inline.
  const borderColors = { caution: '#b45309', rare: '#6d28d9', notable: '#1d4ed8' } as const;
  const borderStyle = model.border && model.border !== 'invasive'
    ? { borderColor: borderColors[model.border], borderWidth: '6px', borderStyle: 'solid' as const }
    : undefined;
  return (
      <div
        className={`data-card ${invasive || model.border === 'invasive' ? 'invasive' : ''}`}
        data-testid="data-card-back"
        ref={widthRef}
        style={borderStyle}
      >
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
