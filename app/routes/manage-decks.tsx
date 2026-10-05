import type { Route } from "./+types/manage-decks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { DECK_DEFS, DEFAULT_DECK_ID, type DeckDef } from "~/data/decks";
import { importDeckZip, deleteUploadedDeck, uploadedDeckBytes, formatBytes } from "~/utils/uploadedDecks";
import { useUploadedDecks } from "~/utils/useUploadedDecks";
import type { DeckId } from "~/utils/deckUtils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Manage Decks - Flash Cards" },
    { name: "description", content: "Add and remove flash card decks" },
  ];
}

type DeckUploadState = {
  status: 'idle' | 'importing' | 'success' | 'error';
  message?: string;
};

const cardCountFor = (def: DeckDef): number =>
  def.categories.reduce((sum, cat) => sum + cat.cards.length, 0);

export default function ManageDecks() {
  const navigate = useNavigate();
  // Uploaded decks live in IndexedDB, so the list starts empty and fills in
  // after mount; reload() refreshes it after an import or delete.
  const { decks: uploadedDecks, reload } = useUploadedDecks();
  const allDecks = useMemo(() => [...DECK_DEFS, ...uploadedDecks], [uploadedDecks]);

  // Stored sizes (manifest + photos in IndexedDB) resolve asynchronously, and
  // re-resolve whenever the list reloads (after an import or delete).
  const [deckSizes, setDeckSizes] = useState<Partial<Record<DeckId, number | null>>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      uploadedDecks.map(async (def) => {
        const bytes = await uploadedDeckBytes(def.id).catch(() => null);
        if (!cancelled) {
          setDeckSizes((prev) => (prev[def.id] === bytes ? prev : { ...prev, [def.id]: bytes }));
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [uploadedDecks]);

  const [uploadState, setUploadState] = useState<DeckUploadState>({ status: 'idle' });
  const uploadNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (uploadNoticeTimer.current) clearTimeout(uploadNoticeTimer.current);
  }, []);

  // Deleting is a two-step inline confirm so it works without native dialogs.
  const [confirmingDelete, setConfirmingDelete] = useState<DeckId | null>(null);

  const handleUploadDeck = async (file: File) => {
    setUploadState({ status: 'importing' });
    try {
      const { id, label } = await importDeckZip(file);
      reload();
      setUploadState({ status: 'success', message: `Imported “${label}”` });
      if (uploadNoticeTimer.current) clearTimeout(uploadNoticeTimer.current);
      // Success notices self-dismiss; errors stay until the next attempt.
      uploadNoticeTimer.current = setTimeout(() => setUploadState({ status: 'idle' }), 5000);
    } catch (error) {
      setUploadState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Import failed.',
      });
    }
  };

  const handleDeleteDeck = async (id: DeckId) => {
    try {
      await deleteUploadedDeck(id);
    } catch (error) {
      setUploadState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Delete failed.',
      });
      return;
    }
    setConfirmingDelete(null);
    // Don't leave a deleted deck saved as the active one.
    if (typeof window !== 'undefined' && localStorage.getItem('deck') === id) {
      localStorage.setItem('deck', DEFAULT_DECK_ID);
    }
    reload();
  };

  const importing = uploadState.status === 'importing';

  // Uploaded decks show their stored size; built-ins aren't stored in the
  // browser, so they get no size at all. "…" marks a size still being read.
  const sizeLabelFor = (def: DeckDef): string | undefined => {
    if (!def.uploaded) return undefined;
    const bytes = deckSizes[def.id];
    if (bytes === undefined) return '…';
    return bytes === null ? undefined : formatBytes(bytes);
  };

  return (
    <main className="decks-main">
      <div className="decks-card">
        <button type="button" className="decks-back" data-testid="back-button" onClick={() => navigate('/')}>
          &larr; Back to Flash Cards
        </button>
        <h1>Manage Decks</h1>
        <p className="decks-intro">
          Add decks exported by Deck Curator, or remove uploaded decks you no
          longer need. Built-in decks are part of the app and cannot be deleted;
          uploaded decks and their photos are stored only in this browser.
          Light decks (.deck.lite) are tiny manifest-only files — they import
          instantly, and their photos stream in from iNaturalist as you browse
          them. To study one offline, open it and use “Download for Offline”
          in the study page’s settings.
        </p>
        <label
          className={`menu-button decks-upload${importing ? ' importing' : ''}`}
          data-testid="upload-deck-button"
          title="Upload a deck .zip, .deck, or .deck.lite exported by Deck Curator"
        >
          {importing ? '⏳ Importing…' : '⬆️ Upload deck (.zip / .deck / .deck.lite)…'}
          <input
            type="file"
            accept=".zip,.deck,.deck.lite,application/zip,application/x-zip-compressed"
            className="upload-input"
            data-testid="upload-deck-input"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadDeck(file);
              e.target.value = '';
            }}
          />
        </label>
        <ul className="decks-list" data-testid="decks-list">
          {allDecks.map((def) => {
            const count = cardCountFor(def);
            const sizeLabel = sizeLabelFor(def);
            return (
              <li key={def.id} className="decks-item" data-testid={`deck-row-${def.id}`}>
                <span className="decks-item-info">
                  <span className="decks-item-label">
                    {def.label}{def.uploaded ? ' (uploaded)' : ''}
                  </span>
                  {def.description && (
                    <span className="decks-item-desc" title={def.description}>{def.description}</span>
                  )}
                </span>
                <span
                  className="decks-item-count"
                  data-testid="deck-storage"
                  title={def.uploaded ? undefined : 'Part of the app — not stored in this browser'}
                >
                  {count} card{count === 1 ? '' : 's'}{sizeLabel ? ` · ${sizeLabel}` : ''}
                </span>
                <button
                  type="button"
                  className="menu-button"
                  data-testid={`deck-credits-button-${def.id}`}
                  title={`Photo credits for ${def.label}`}
                  onClick={() => navigate(`/credits?deck=${encodeURIComponent(def.id)}`)}
                >
                  🖼️
                </button>
                {def.uploaded && (
                  confirmingDelete === def.id ? (
                    <>
                      <button
                        type="button"
                        className="menu-button danger"
                        data-testid="delete-deck-confirm"
                        title="Really delete this deck"
                        onClick={() => {
                          setConfirmingDelete(null);
                          handleDeleteDeck(def.id);
                        }}
                      >
                        🗑 Delete “{def.label}”?
                      </button>
                      <button
                        type="button"
                        className="menu-button"
                        data-testid="delete-deck-cancel"
                        onClick={() => setConfirmingDelete(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="menu-button"
                      data-testid="delete-deck-button"
                      title={`Delete ${def.label}`}
                      disabled={importing}
                      onClick={() => setConfirmingDelete(def.id)}
                    >
                      🗑
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
        {(uploadState.status === 'success' || uploadState.status === 'error') && (
          <div className={`upload-status ${uploadState.status}`} data-testid="upload-status" role="status">
            {uploadState.status === 'success' ? '✅ ' : '⚠️ '}{uploadState.message}
          </div>
        )}
      </div>
    </main>
  );
}