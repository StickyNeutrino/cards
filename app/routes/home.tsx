import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { Card } from "~/card/card";
import { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Flash Cards" },
    { name: "description", content: "SD Canyonlands Flashcards" },
  ];
}

const plants = [
"Mugwort",
"Toyon",
"California Sagebrush",
"Sycamore",
"Poison Oak",
"Tarweed",
"Laurel sumac",
"Black Sage",
"San Diego Sunflower",
"California buckwheat",
"Primrose",
"Mission Manzanita",
"Mulefat",
"Yucca",
"Spiny redberry",
"Wild Rye",
"Sagewort",
"Everlasting",
"Elderberry",
"California sunflower",
"Bladderpod",
"Hollyleaf Cherry",
"White Sage",
"Willow",
"California wild rose",
"Nightshade",
"Narrowleaf Milkweed",
"Golden Yarrow",
"Monkeyflower",
"Yerba Santa",
"Gooseberry",
"Lupine",
"Chamise",
"Cholla",
"Mallow",
"Coyote brush",
"Marsh Elder",
"Lemonadeberry",
"Honeysuckle",
"Broom baccharis",
"Scrub Oak",
"Cottonwood",
"Deerweed",
"Ceanothus",
"Yerba Mansa",
]

export default function Home() {
  const [currentCard, setCurrentCard] = useState("Black Sage")
  

  const nextAction = () => {
    const randomIndex = Math.floor(Math.random() * plants.length);
    setCurrentCard(plants[randomIndex])
  }

  return (
  <main>

    <Card card={currentCard}/>
    <div id="button-container">
    <button id="next-button" onClick={nextAction}>
    <img src="/arrow-right-solid-full.svg"/>
    </button>
    </div>
    </main>)
}
