interface CardProps {
    card: string;
  }

export function Card({card}:CardProps) {
    return (

        <div className="card-area">
        <div className="flip-card">
        <div className="flip-card-inner">
        <img className="flip-card-front" src={`/cards/${card} Front.png`}/>
        <img className="flip-card-back" src={`/cards/${card} Back.png`}/>
        </div>
        </div>
        </div>

  
    )
}