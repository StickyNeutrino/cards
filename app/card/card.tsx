import { invasives } from "~/routes/card-lists";

interface CardProps {
  card: string;
  flipped: boolean;
  widthRef: React.RefObject<HTMLDivElement | null>;
  flipSpeed: number;
  onClick?: () => void;
}

export function Card({card, flipped, widthRef, flipSpeed, onClick}:CardProps) {
    const invasive = invasives.includes(card);
    
    const handleClick = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        onClick?.();
    };
    return (
        <div className="card-area" ref={widthRef} data-testid="card" data-card={card} data-flipped={flipped} data-invasive={invasive} onClick={handleClick} onTouchEnd={handleClick}>
            <div className={`flip-card ${flipped ? "flipped" : "flip-card-enabled"}`} style={{ '--flip-speed': `${flipSpeed}s` } as React.CSSProperties}>
                <div className={`flip-card-inner ${flipSpeed === 0 ? "" : "flip-card-inner-animated"}`}>
                    {card && <img className="flip-card-front" src={`/cards/${card} Front.png`}/>}
                    {card && <img className={`flip-card-back ${invasive ? "invasive" : ""}`} src={`/cards/${card} Back.png`}/>}
                </div>
            </div>
        </div>
    )
}