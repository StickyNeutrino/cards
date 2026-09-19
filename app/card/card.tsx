import { useEffect, useMemo, useRef, useState } from "react";
import { defaultInvasive } from "~/data/decks";
import { DataCard, type DataCardModel } from "~/card/dataCard";

interface CardProps {
  card: string | null;
  flipped: boolean;
  widthRef: React.Ref<HTMLImageElement | null>;
  flipSpeed: number;
  onClick?: () => void;
  /** Explicit image paths; defaults to the Canyonlands deck naming scheme. */
  front?: string;
  back?: string;
  /** Explicit invasive flag; defaults to the deck registry's invasive lookup. */
  invasive?: boolean;
  /**
   * Data-driven card fields (deck cardFormat "data"): when present, both
   * faces are drawn as HTML by DataCard instead of <img> elements, and
   * front/back/invasive image handling is skipped. The flip animation, peek
   * behavior, and aspect ratio are shared with image cards.
   */
  dataCard?: DataCardModel;
}

export function Card({card, flipped, widthRef, flipSpeed, onClick, front, back, invasive, dataCard}:CardProps) {
    const isInvasive = invasive ?? (card !== null && defaultInvasive(card));
    const frontSrc = front ?? (card !== null ? `/cards/${card} Front.jpg` : "");
    const backSrc = back ?? (card !== null ? `/cards/${card} Back.jpg` : "");

    const [peeked, setPeeked] = useState(false);
    const canHover = useMemo(() => (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ), []);

    const prevFlipped = useRef(flipped);
    useEffect(() => {
        if (prevFlipped.current && !flipped) {
            setPeeked(false);
        }
        prevFlipped.current = flipped;
    }, [flipped]);

    const showBack = flipped || peeked;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPeeked(false);
        onClick?.();
    };
    const showDataFaces = dataCard !== undefined && card !== null;
    return (
        <div
            className="card-area"
            data-testid="card"
            data-card={card}
            data-flipped={showBack}
            data-invasive={isInvasive}
            onClick={handleClick}
            onTouchStart={() => setPeeked(false)}
            onMouseEnter={canHover ? () => setPeeked(true) : undefined}
            onMouseLeave={canHover ? () => setPeeked(false) : undefined}
        >
            <div className={`flip-card ${showBack ? "flipped" : "flip-card-enabled"}`} style={{ '--flip-speed': `${flipSpeed}s` } as React.CSSProperties}>
                <div className={`flip-card-inner ${flipSpeed === 0 ? "" : "flip-card-inner-animated"}`}>
                    {showDataFaces ? (
                        <>
                            <div className="flip-card-front data-face">
                                <DataCard model={dataCard} face="front" />
                            </div>
                            {/* The width element for data cards is the canvas
                                inside the back face (it is the part with the
                                visible 750:1050 size), hence the cast. */}
                            <div className="flip-card-back data-face">
                                <DataCard
                                    model={dataCard}
                                    face="back"
                                    invasive={isInvasive}
                                    widthRef={widthRef as React.Ref<HTMLDivElement | null>}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {card && <img className="flip-card-front" src={frontSrc}/>}
                            {card && <img className={`flip-card-back ${isInvasive ? "invasive" : ""}`} ref={widthRef} src={backSrc}/>}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
