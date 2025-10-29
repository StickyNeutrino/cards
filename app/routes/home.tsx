import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { Card } from "~/card/card";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Flash Cards" },
    { name: "description", content: "SD Canyonlands Flashcards" },
  ];
}

const plants = [
"Sycamore",
"Blue Plumbago",
"Cheeseweed",
"Fennel",
"Monkeyflower",
"Horehound",
"Sweet Pea",
"Toyon",
"Mexican Fan Palm",
"Poison Hemlock",
"Golden Yarrow",
"Arundo",
"Eucalyptus",
"California Sagebrush",
"Mustard",
"Nasturtium",
"Jade",
"Tarweed",
"Gooseberry",
"Laurel sumac",
"Thistle",
"Acacia",
"Everlasting",
"Bridal Creeper",
"Curly Dock",
"Crown Daisy",
"Himalayan Blackberry",
"Yerba Santa",
"Peruvian Pepper",
"Nightshade",
"Pampas Grass",
"Elderberry",
"Coyote brush",
"Ceanothus",
"Willow",
"Honeysuckle",
"California sunflower",
"Beggarticks",
"Radish",
"Brazilian Pepper",
"Broom baccharis",
"Deerweed",
"Bladderpod",
"Ice Plant",
"Marsh Elder",
"Spiny redberry",
"Lemonadeberry",
"Mission Manzanita",
"African Flag",
"Poison Oak",
"Scrub Oak",
"Yerba Mansa",
"Stinkwort",
"Mallow",
"Hollyleaf Cherry",
"Cottonwood",
"Lupine",
"California buckwheat",
"Narrowleaf Milkweed",
"Wild Rye",
"Mugwort",
"Sagewort",
"Yucca",
"Black Sage",
"Tamarisk",
"Chamise",
"Canary Island Date Palm",
"Cape Ivy",
"Primrose",
"California wild rose",
"Mulefat",
"Umbrella Sedge",
"Cholla",
"Castor",
"Purple Fountain Grass",
"San Diego Sunflower",
"Myoporum",
"Tree Tobacco",
"Ox Tongue",
"White Sage",
]

const invasives = [
"Arundo",
"Castor",
"Ox Tongue",
"Crown Daisy",
"Peruvian Pepper",
"Tamarisk",
"Cape Ivy",
"Thistle",
"Fennel",
"Jade",
"Himalayan Blackberry",
"Blue Plumbago",
"Brazilian Pepper",
"Sweet Pea",
"Cheeseweed",
"African Flag",
"Bridal Creeper",
"Beggarticks",
"Poison Hemlock",
"Purple Fountain Grass",
"Myoporum",
"Mexican Fan Palm",
"Tree Tobacco",
"Horehound",
"Mustard",
"Ice Plant",
"Canary Island Date Palm",
"Radish",
"Stinkwort",
"Curly Dock",
"Acacia",
"Pampas Grass",
"Umbrella Sedge",
"Nasturtium",
]

function random_plant() {
  return plants[ Math.floor(Math.random() * plants.length) ]
}

const deck = [...new Array(1000)].map(() => random_plant());
let max_index = 0;

export default function Home() {
  const [cardIndex, setIndex] = useState(0)
  const currentCard = deck[cardIndex % deck.length]
  
  const nextAction = () => {
    setIndex(cardIndex + 1)
  }

  const backAction = () => {
    if (cardIndex == 0) { return }
    setIndex(cardIndex - 1)
  }

  if (cardIndex > max_index) {
    max_index = cardIndex 
    umami.track('viewed card');
  }

  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: { key: any; }) => {
      switch (event.key) {
        case 'ArrowUp':
          setFlipped(true);
          break;
        case 'ArrowRight':
          nextAction();
          break;
        case 'ArrowLeft':
          backAction();
          break;
      }
    };
    const handleKeyUp = (event: { key: any; }) => {
      switch (event.key) {
        case 'ArrowUp':
          setFlipped(false);
          break;
      };
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);


    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cardIndex]); 

  const invasive = invasives.includes(currentCard)

  const elementRef = useRef(null);
  const [elementWidth, setElementWidth] = useState(0);

  useLayoutEffect(() => {
    if (elementRef.current) {
      setElementWidth(elementRef.current.offsetWidth); // or clientWidth
    }
  }, []); // Empty dependency array ensures it runs only once after mount

  return (
  <main>
    <Card card={currentCard} invasive={invasive} flipped={flipped} widthRef={elementRef}/>
    <div id="button-container" style={{width:`calc(${elementWidth}px)`}}>
    <button id="back-button" className="control-button" onClick={backAction}>
    <img src="/arrow-left-solid-full.svg"/>
    </button>
    <button id="next-button" className="control-button" onClick={nextAction}>
    <img src="/arrow-right-solid-full.svg"/>
    </button>
    </div>
    </main>)
}
