interface CardProps {
    card: string;
    invasive: Boolean
  }

export function Card({card, invasive}:CardProps) {
    return (

        <div className="card-area">
        <div className="flip-card">
        <div className="flip-card-inner">
        <img className="flip-card-front" src={`/cards/${card} Front.png`}/>
        <img className={`flip-card-back ${invasive ? "invasive" : ""}`} src={`/cards/${card} Back.png`}/>
        </div>
        </div>
        </div>

  
    )
}