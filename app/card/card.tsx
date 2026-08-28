import { useEffect, useMemo, useRef, useState } from "react";
import { invasives } from "~/routes/card-lists";

interface CardProps {
  card: string;
  flipped: boolean;
  widthRef: React.RefObject<HTMLImageElement | null>;
  flipSpeed: number;
  onClick?: () => void;
}

export function Card({card, flipped, widthRef, flipSpeed, onClick}:CardProps) {
    const invasive = invasives.includes(card);

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
    return (
        <div
            className="card-area"
            data-testid="card"
            data-card={card}
            data-flipped={showBack}
            data-invasive={invasive}
            onClick={handleClick}
            onTouchStart={() => setPeeked(false)}
            onMouseEnter={canHover ? () => setPeeked(true) : undefined}
            onMouseLeave={canHover ? () => setPeeked(false) : undefined}
        >
            <div className={`flip-card ${showBack ? "flipped" : "flip-card-enabled"}`} style={{ '--flip-speed': `${flipSpeed}s` } as React.CSSProperties}>
                <div className={`flip-card-inner ${flipSpeed === 0 ? "" : "flip-card-inner-animated"}`}>
                    {card && <img className="flip-card-front" src={`/cards/${card} Front.jpg`}/>}
                    {card && <img className={`flip-card-back ${invasive ? "invasive" : ""}`} ref={widthRef} src={`/cards/${card} Back.jpg`}/>}
                </div>
            </div>
        </div>
    )
}
