# San Diego Native Species Flashcards

<div align="center">

**An offline-first study app for identifying the birds and plants of the San Diego canyons**

A digital companion to San Diego Canyonlands' physical flashcard deck — 154 species (69 birds, 85 plants), each with field photos on the front and the common name, scientific name, family, and Kumeyaay name on the back.

## [Open the app — cards.unimpossy.com](https://cards.unimpossy.com)

[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-306_passing-brightgreen)](#engineering-highlights)
[![Playwright](https://img.shields.io/badge/Playwright-5_browsers-2ead33?logo=playwright&logoColor=white)](https://playwright.dev)
[![Docker](https://img.shields.io/badge/Docker-Kubernetes-2496ed?logo=kubernetes&logoColor=white)](#deployment)

<p>
  <img src="docs/screenshots/home.png" width="48%" alt="Card front showing field photos of a Coast Live Oak" />
  <img src="docs/screenshots/home-flipped.png" width="48%" alt="Card back showing the common, scientific, family, and Kumeyaay names of the Coast Live Oak" />
</p>

*Front of card (field photos) · Back of card (names and taxonomy)*

</div>

## What it does

Flip through the deck like real flashcards: photos on the front, names on the back. One tap downloads every card to your device, after which the app runs entirely offline.

- **Study by category** — Plants, Birds, or Both, with a shuffled deck so no two sessions feel the same.
- **Two decks: Canyonlands & Healthy Canyons** — the original 154-card physical deck, plus a generated Healthy Canyons deck built from the Healthy Canyons summary spreadsheets (~1,300 species across 15 canyons) with photos from iNaturalist observers. Switch decks from the menu; each keeps its own category cycle.
- **Browse and search** — A filterable catalog of all species with instant search and deep links to each card.
- **Learn to spot invaders** — Invasive plant species are flagged with a red border to build conservation awareness; the Healthy Canyons deck flags every non-native species the same way.
- **Works offline** — Installable to your home screen as a PWA; study with no network after a one-time download.
- **Feels like a real deck** — 3D card flip with adjustable speed, tap-to-flip on touch screens, hover-to-peek on desktop, and keyboard shortcuts.
- **Private by default** — No cookies. Optional analytics and crash reporting can be switched off anytime; see the [privacy policy](https://cards.unimpossy.com/privacy).

## Screenshots

| | |
|---|---|
| ![Card list with search and filters](docs/screenshots/card-lists.png) | ![Search filtering the card list](docs/screenshots/card-lists-search.png) |
| *Browsable catalog with live search and category filters* | *Search narrows 154 species instantly* |
| ![Mobile home view](docs/screenshots/mobile-home.png) | ![Mobile flipped card](docs/screenshots/mobile-flipped.png) |
| *Mobile: card front* | *Mobile: flipped card* |

## Engineering highlights

| Area | What's inside |
|---|---|
| **Offline-first architecture** | Two-tier service worker: cache-first for card images (with graceful fallback to the previous cache generation), network-first for the app shell. A one-tap preload fetches 330 progressive-JPEG card images with a live progress bar, and a post-build script injects hashed asset names into the service worker so every deploy caches correctly. |
| **Privacy by design** | Cookieless analytics and crash reporting are enabled by default and can be disabled anytime from Settings or the first-visit banner — every tracking call re-checks the preference, so tracking stops immediately. No cookies, no persistent identifiers, self-hosted fonts. Playwright tests assert that opt-out payloads carry no identifiers and that opting out stops all network calls. |
| **Testing culture** | 306 tests — 264 unit/integration (Vitest) and 42 end-to-end (Playwright) across Chromium, Firefox, WebKit, Mobile Chrome, and Mobile Safari, roughly 1.8 lines of test code per line of app code. fast-check property-based tests verify deck/shuffle invariants, a custom harness reruns the unit suite up to 10× to catch flaky tests, and CSS parser tests lock touch/hover behavior in as executable contracts. E2E tests run with analytics hard-blocked: every `umami.is` request is aborted and fails the test, so test traffic never reaches production analytics. |
| **Production operations** | Multi-stage Docker build with the git SHA injected at build time and surfaced in the UI. Hardened Kubernetes pods (non-root, read-only root filesystem, dropped capabilities, resource limits, health probes) behind Traefik with automatic Let's Encrypt TLS. A separate Express crash-report microservice, covered by its own supertest suite. |

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, React Router 7 (framework mode, SPA), TypeScript 5.9, Tailwind CSS 4, Vite 7 |
| PWA / offline | Service worker (cache-first images, network-first shell), Web App Manifest, image preloading |
| Testing | Vitest 4, React Testing Library, fast-check, Playwright, supertest |
| Backend (errors) | Node.js + Express microservice |
| Infrastructure | Docker (multi-stage), Kubernetes (hardened deployments), Traefik, cert-manager (Let's Encrypt) |

## Getting started

Requires Node.js 20+.

```bash
git clone <repository-url>
cd cards
npm install
npm run dev        # http://localhost:5173
```

Other useful commands:

```bash
npm run build        # Production build
npm start            # Serve the production build locally
npm run typecheck    # Generate routes + run tsc
npm run test         # Unit/integration tests (watch mode)
npm run test:run     # Unit/integration tests (single run)
npm run test:coverage # Coverage report
npx playwright test  # End-to-end tests across 5 browsers
```

## Healthy Canyons deck generation

The Canyonlands deck is the scanned physical flashcard deck. The **Healthy Canyons** deck is
generated offline by scripts in `scripts/healthy-cards/` — app users never talk to the
iNaturalist API; they just receive static card images and a bundled manifest like the
original deck.

```bash
npm run generate:healthy            # full pipeline (parse → fetch → render → manifest)
npm run generate:healthy:parse      #  1. spreadsheets → data/healthy/species.json
npm run generate:healthy:fetch      #  2. iNaturalist photo download (slow, resumable)
npm run generate:healthy:render     #  3. composite card images → public/cards-healthy/
npm run generate:healthy:manifest   #  4. app manifest + data/healthy/report.md
```

How it works:

1. **Parse** the two Healthy Canyons summary spreadsheets (one sheet per canyon) into a normalized
   master species list. Rows that are genus-only, placeholders (`"Agyneta" #1`), or otherwise
   unresolvable are excluded and counted.
2. **Fetch** resolves every scientific name on iNaturalist (handling synonyms such as
   *Dendroica* → *Setophaga*), then downloads the three highest-voted Creative Commons photos,
   preferring observations in San Diego County, then California, then worldwide. Research-grade
   observations are preferred; CC-ND and all-rights-reserved photos are never used. Downloads
   are cached in `assets/healthy-raw/` (gitignored) and the stage is safe to re-run.
3. **Render** composites the card fronts in the physical deck's layout (one large habitat
   photo + two detail shots) and renders the backs — common name, scientific name, family,
   native/invasive status, CNPS/CESA/FESA rarity, photo credits, and the Canyonlands logo —
   with the app's Inter font, into `public/cards-healthy/`.
4. **Manifest** writes `app/data/healthyCards.ts` (imported by the app) and a generation
   report at `data/healthy/report.md` describing exactly how many cards were made, how many
   lacked photos or failed to resolve, and why.

Every stage is idempotent and cached (API responses in `data/healthy/api-cache/`), so you can
re-run the pipeline after tweaking a spreadsheet without re-downloading everything. Photo
attribution is shown on each card back and on the in-app credits page (`/credits`).

## Deck repositories

Decks are self-contained Git repositories under `decks/`, each owning its card
images and metadata. The app is deck-agnostic: it renders whatever the registry
says.

| Deck repo | Contents |
| --- | --- |
| `decks/canyonlands/` | The scanned 154-card physical deck (images + `manifest.json`). |
| `decks/healthy-canyons/` | The generated survey deck: images, `manifest.json`, the source spreadsheets, and the full generation pipeline (`npm run generate`). |

`scripts/sync-decks.ts` (run automatically before `dev` and `build`) copies each
deck's images to `public/decks/<id>/cards/` and writes each deck's manifest to
`app/data/decks/<id>.json` (with survey-specific data stripped — it stays only
in the private deck repository). The manifests drive deck switching,
categories, invasive flags, and the credits page. Adding a deck = adding a repo
under `decks/` with a `manifest.json` plus a one-line import in
`app/data/decks.ts`.

To push the deck repos to GitHub, run `git init`/`git remote add origin …`
inside each (they are already initialized if you cloned this workspace) and
point CI at them. The app repo ignores `decks/` — fresh checkouts clone the
deck repos there before running `npm run dev`/`build`.

## Deployment

The app ships as a static SPA built inside a multi-stage Docker image:

```bash
docker build -t cards --build-arg BUILD_SHA=$(git rev-parse --short HEAD) .
docker run -p 3000:3000 cards
```

Kubernetes manifests in `k8s/` deploy two services:

- **Cards** — the PWA, in production at [cards.unimpossy.com](https://cards.unimpossy.com) (testing environment at `testing.cards.unimpossy.com`).
- **Error receiver** (`error-receiver/`) — a minimal Express service at `errors.cards.unimpossy.com` that accepts crash reports and logs them as structured JSON.

Ingresses use Traefik with cert-manager-issued Let's Encrypt certificates; deploy scripts build images with the current git SHA and push to a private registry.

## License & credits

The application code is licensed under the [GNU Affero General Public License v3](LICENSE) (AGPL-3.0-or-later), with source available at [github.com/StickyNeutrino/cards](https://github.com/StickyNeutrino/cards). Card imagery for the Canyonlands deck is courtesy of [San Diego Canyonlands](https://www.sdcanyonlands.org/) and is not covered by the code license. Healthy Canyons card photos are from [iNaturalist](https://www.inaturalist.org) contributors under Creative Commons licenses; per-photo attributions are on each card and on the credits page.
