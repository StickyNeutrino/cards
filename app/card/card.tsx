
interface CardProps {
    card: string;
    invasive: Boolean;
    flipped: Boolean;
  }

export function Card({card, invasive, flipped}:CardProps) {
    return (

        <div className="card-area">
        <div className={`flip-card ${flipped ? "flipped" : "flip-card-enabled"}`}>
        <div className="flip-card-inner">
        <img className="flip-card-front" src={`/cards/${card} Front.png`}/>
        <img className={`flip-card-back ${invasive ? "invasive" : ""}`} src={`/cards/${card} Back.png`}/>
        </div>
        </div>
        </div>

  
    )
}