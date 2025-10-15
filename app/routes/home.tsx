import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { Card } from "~/card/card";
import { useEffect, useState } from "react";

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
export default function Home() {
  const [currentCard, setCurrentCard] = useState(random_plant())
  

  const nextAction = () => {
    setCurrentCard(random_plant())
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
  }, []); 

  const invasive = invasives.includes(currentCard)

  return (
  <main>

    <Card card={currentCard} invasive={invasive} flipped={flipped}/>
    <div id="button-container">
    <button id="next-button" onClick={nextAction}>
    <img src="/arrow-right-solid-full.svg"/>
    </button>
    </div>
    </main>)
}
