import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { Card } from "~/card/card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Flash Cards" },
    { name: "description", content: "SD Canyonlands Flashcards" },
  ];
}

export default function Home() {
  return (<main><Card/></main>)
}
