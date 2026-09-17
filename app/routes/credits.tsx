import type { Route } from "./+types/credits";
import { useMemo, useState } from "react";
import { healthyPlants, healthyAnimals, healthyGeneratedAt } from "~/data/healthyCards";
import type { HealthyCard } from "~/data/healthyCards";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Photo Credits - Flash Cards" },
    { name: "description", content: "Attribution for the iNaturalist photos used on Healthy Canyons cards" },
  ];
}

interface Credit {
  cardName: string;
  observer: string;
  license: string;
  observationUrl: string;
  observationId: number;
  placeLabel: string;
}

function collectCredits(): Credit[] {
  const cards: HealthyCard[] = [...healthyPlants, ...healthyAnimals];
  const credits: Credit[] = [];
  for (const card of cards) {
    for (const photo of card.photos) {
      credits.push({
        cardName: card.name,
        observer: photo.observer,
        license: photo.license,
        observationUrl: photo.observationUrl,
        observationId: photo.observationId,
        placeLabel: photo.placeLabel,
      });
    }
  }
  return credits;
}

const licenseLabel = (code: string): string => {
  if (!code) return "(no license)";
  if (code.toLowerCase() === "cc0") return "CC0";
  return code.toLowerCase().replace(/^cc-/, "CC ").toUpperCase();
};

export default function Credits() {
  const credits = useMemo(collectCredits, []);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return credits.filter(
      (c) => !q || c.cardName.toLowerCase().includes(q) || c.observer.toLowerCase().includes(q),
    );
  }, [credits, search]);

  return (
    <main className="credits-main">
      <h1>Photo Credits</h1>
      <p className="credits-intro">
        The Healthy Canyons deck uses photographs contributed by naturalists on{" "}
        <a href="https://www.inaturalist.org" target="_blank" rel="noreferrer">iNaturalist</a>{" "}
        under Creative Commons licenses. Each card credits its photographers; the full
        attributions are listed below. {healthyGeneratedAt && <>Cards generated {healthyGeneratedAt.slice(0, 10)}. </>}
      </p>
      <input
        type="search"
        className="search-input"
        placeholder="Search by card or photographer..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="credits-search"
      />
      <table className="credits-table" data-testid="credits-table">
        <thead>
          <tr>
            <th>Card</th>
            <th>Photographer</th>
            <th>License</th>
            <th>Observation</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c, i) => (
            <tr key={`${c.observationId}-${i}`}>
              <td>{c.cardName}</td>
              <td>{c.observer}</td>
              <td>{licenseLabel(c.license)}</td>
              <td>
                <a href={c.observationUrl} target="_blank" rel="noreferrer">
                  iNat #{c.observationId}
                </a>
                {c.placeLabel && c.placeLabel !== "worldwide" ? ` (${c.placeLabel})` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <p className="credits-empty">No matching credits.</p>}
    </main>
  );
}