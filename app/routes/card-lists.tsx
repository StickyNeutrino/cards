import type { Route } from "./+types/card-lists";
import { useState, useMemo, useRef } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Card Lists - Flash Cards" },
    { name: "description", content: "Browse all available flash cards" },
  ];
}

export const birds = [
    {
        "name": "Acorn Woodpecker",
        "front": "Acorn Woodpecker Front.jpg",
        "back": "Acorn Woodpecker Back.jpg"
    },
    {
        "name": "American Robin",
        "front": "American Robin Front.jpg",
        "back": "American Robin Back.jpg"
    },
    {
        "name": "Northern Rough-winged Swallow",
        "front": "Northern Rough-winged Swallow Front.jpg",
        "back": "Northern Rough-winged Swallow Back.jpg"
    },
    {
        "name": "American Crow",
        "front": "American Crow Front.jpg",
        "back": "American Crow Back.jpg"
    },
    {
        "name": "Brown-headed Cowbird",
        "front": "Brown-headed Cowbird Front.jpg",
        "back": "Brown-headed Cowbird Back.jpg"
    },
    {
        "name": "Song Sparrow",
        "front": "Song Sparrow Front.jpg",
        "back": "Song Sparrow Back.jpg"
    },
    {
        "name": "Blue-gray Gnatcatcher",
        "front": "Blue-gray Gnatcatcher Front.jpg",
        "back": "Blue-gray Gnatcatcher Back.jpg"
    },
    {
        "name": "Wrentit",
        "front": "Wrentit Front.jpg",
        "back": "Wrentit Back.jpg"
    },
    {
        "name": "Rufous Hummingbird",
        "front": "Rufous Hummingbird Front.jpg",
        "back": "Rufous Hummingbird Back.jpg"
    },
    {
        "name": "Black-headed Grosbeak",
        "front": "Black-headed Grosbeak Front.jpg",
        "back": "Black-headed Grosbeak Back.jpg"
    },
    {
        "name": "Greater Roadrunner",
        "front": "Greater Roadrunner Front.jpg",
        "back": "Greater Roadrunner Back.jpg"
    },
    {
        "name": "Ash-throated Flycatcher",
        "front": "Ash-throated Flycatcher Front.jpg",
        "back": "Ash-throated Flycatcher Back.jpg"
    },
    {
        "name": "Cassin's Kingbird",
        "front": "Cassin's Kingbird Front.jpg",
        "back": "Cassin's Kingbird Back.jpg"
    },
    {
        "name": "Mourning Dove",
        "front": "Mourning Dove Front.jpg",
        "back": "Mourning Dove Back.jpg"
    },
    {
        "name": "Downy Woodpecker",
        "front": "Downy Woodpecker Front.jpg",
        "back": "Downy Woodpecker Back.jpg"
    },
    {
        "name": "Cliff Swallow",
        "front": "Cliff Swallow Front.jpg",
        "back": "Cliff Swallow Back.jpg"
    },
    {
        "name": "Ruby-crowned Kinglet",
        "front": "Ruby-crowned Kinglet Front.jpg",
        "back": "Ruby-crowned Kinglet Back.jpg"
    },
    {
        "name": "Spotted Towhee",
        "front": "Spotted Towhee Front.jpg",
        "back": "Spotted Towhee Back.jpg"
    },
    {
        "name": "Black Phoebe",
        "front": "Black Phoebe Front.jpg",
        "back": "Black Phoebe Back.jpg"
    },
    {
        "name": "House Finch",
        "front": "House Finch Front.jpg",
        "back": "House Finch Back.jpg"
    },
    {
        "name": "Red-tailed Hawk",
        "front": "Red-tailed Hawk Front.jpg",
        "back": "Red-tailed Hawk Back.jpg"
    },
    {
        "name": "Band-tailed Pigeon",
        "front": "Band-tailed Pigeon Front.jpg",
        "back": "Band-tailed Pigeon Back.jpg"
    },
    {
        "name": "Lesser Goldfinch",
        "front": "Lesser Goldfinch Front.jpg",
        "back": "Lesser Goldfinch Back.jpg"
    },
    {
        "name": "Red-winged Blackbird",
        "front": "Red-winged Blackbird Front.jpg",
        "back": "Red-winged Blackbird Back.jpg"
    },
    {
        "name": "White-breasted Nuthatch",
        "front": "White-breasted Nuthatch Front.jpg",
        "back": "White-breasted Nuthatch Back.jpg"
    },
    {
        "name": "Western Tanager",
        "front": "Western Tanager Front.jpg",
        "back": "Western Tanager Back.jpg"
    },
    {
        "name": "Turkey Vulture",
        "front": "Turkey Vulture Front.jpg",
        "back": "Turkey Vulture Back.jpg"
    },
    {
        "name": "California Quail",
        "front": "California Quail Front.jpg",
        "back": "California Quail Back.jpg"
    },
    {
        "name": "White-crowned Sparrow",
        "front": "White-crowned Sparrow Front.jpg",
        "back": "White-crowned Sparrow Back.jpg"
    },
    {
        "name": "Yellow Warbler",
        "front": "Yellow Warbler Front.jpg",
        "back": "Yellow Warbler Back.jpg"
    },
    {
        "name": "Northern Mockingbird",
        "front": "Northern Mockingbird Front.jpg",
        "back": "Northern Mockingbird Back.jpg"
    },
    {
        "name": "Say's Phoebe",
        "front": "Say's Phoebe Front.jpg",
        "back": "Say's Phoebe Back.jpg"
    },
    {
        "name": "House Sparrow",
        "front": "House Sparrow Front.jpg",
        "back": "House Sparrow Back.jpg"
    },
    {
        "name": "Cooper's Hawk",
        "front": "Cooper's Hawk Front.jpg",
        "back": "Cooper's Hawk Back.jpg"
    },
    {
        "name": "California Towhee",
        "front": "California Towhee Front.jpg",
        "back": "California Towhee Back.jpg"
    },
    {
        "name": "Bushtit",
        "front": "Bushtit Front.jpg",
        "back": "Bushtit Back.jpg"
    },
    {
        "name": "California Scrub Jay",
        "front": "California Scrub Jay Front.jpg",
        "back": "California Scrub Jay Back.jpg"
    },
    {
        "name": "Nuttall's Woodpecker",
        "front": "Nuttall's Woodpecker Front.jpg",
        "back": "Nuttall's Woodpecker Back.jpg"
    },
    {
        "name": "Allen's Hummingbird",
        "front": "Allen's Hummingbird Front.jpg",
        "back": "Allen's Hummingbird Back.jpg"
    },
    {
        "name": "Northern Flicker",
        "front": "Northern Flicker Front.jpg",
        "back": "Northern Flicker Back.jpg"
    },
    {
        "name": "Dark-eyed Junco",
        "front": "Dark-eyed Junco Front.jpg",
        "back": "Dark-eyed Junco Back.jpg"
    },
    {
        "name": "Bewick's Wren",
        "front": "Bewick's Wren Front.jpg",
        "back": "Bewick's Wren Back.jpg"
    },
    {
        "name": "European Starling",
        "front": "European Starling Front.jpg",
        "back": "European Starling Back.jpg"
    },
    {
        "name": "Yellow-rumped Warbler",
        "front": "Yellow-rumped Warbler Front.jpg",
        "back": "Yellow-rumped Warbler Back.jpg"
    },
    {
        "name": "Anna's Hummingbird",
        "front": "Anna's Hummingbird Front.jpg",
        "back": "Anna's Hummingbird Back.jpg"
    },
    {
        "name": "Western Flycatcher",
        "front": "Western Flycatcher Front.jpg",
        "back": "Western Flycatcher Back.jpg"
    },
    {
        "name": "Scaly-breasted Munia",
        "front": "Scaly-breasted Munia Front.jpg",
        "back": "Scaly-breasted Munia Back.jpg"
    },
    {
        "name": "Common Yellowthroat",
        "front": "Common Yellowthroat Front.jpg",
        "back": "Common Yellowthroat Back.jpg"
    },
    {
        "name": "Wilson's Warbler",
        "front": "Wilson's Warbler Front.jpg",
        "back": "Wilson's Warbler Back.jpg"
    },
    {
        "name": "Red-shouldered Hawk",
        "front": "Red-shouldered Hawk Front.jpg",
        "back": "Red-shouldered Hawk Back.jpg"
    },
    {
        "name": "Least Bell's Vireo",
        "front": "Least Bell's Vireo Front.jpg",
        "back": "Least Bell's Vireo Back.jpg"
    },
    {
        "name": "Townsend's Warbler",
        "front": "Townsend's Warbler Front.jpg",
        "back": "Townsend's Warbler Back.jpg"
    },
    {
        "name": "Orange-crowned Warbler",
        "front": "Orange-crowned Warbler Front.jpg",
        "back": "Orange-crowned Warbler Back.jpg"
    },
    {
        "name": "Coastal Cactus Wren",
        "front": "Coastal Cactus Wren Front.jpg",
        "back": "Coastal Cactus Wren Back.jpg"
    },
    {
        "name": "Western Meadowlark",
        "front": "Western Meadowlark Front.jpg",
        "back": "Western Meadowlark Back.jpg"
    },
    {
        "name": "Eurasian Collared Dove",
        "front": "Eurasian Collared Dove Front.jpg",
        "back": "Eurasian Collared Dove Back.jpg"
    },
    {
        "name": "Light-footed Ridgeway's Rail",
        "front": "Light-footed Ridgeway's Rail Front.jpg",
        "back": "Light-footed Ridgeway's Rail Back.jpg"
    },
    {
        "name": "Cedar Waxwing",
        "front": "Cedar Waxwing Front.jpg",
        "back": "Cedar Waxwing Back.jpg"
    },
    {
        "name": "Coastal California Gnatcatcher",
        "front": "Coastal California Gnatcatcher Front.jpg",
        "back": "Coastal California Gnatcatcher Back.jpg"
    },
    {
        "name": "American Kestrel",
        "front": "American Kestrel Front.jpg",
        "back": "American Kestrel Back.jpg"
    },
    {
        "name": "Common Raven",
        "front": "Common Raven Front.jpg",
        "back": "Common Raven Back.jpg"
    },
    {
        "name": "Northern House Wren",
        "front": "Northern House Wren Front.jpg",
        "back": "Northern House Wren Back.jpg"
    },
    {
        "name": "Western Barn Owl",
        "front": "Western Barn Owl Front.jpg",
        "back": "Western Barn Owl Back.jpg"
    },
    {
        "name": "California Thrasher",
        "front": "California Thrasher Front.jpg",
        "back": "California Thrasher Back.jpg"
    },
    {
        "name": "Great Horned Owl",
        "front": "Great Horned Owl Front.jpg",
        "back": "Great Horned Owl Back.jpg"
    },
    {
        "name": "Oak Titmouse",
        "front": "Oak Titmouse Front.jpg",
        "back": "Oak Titmouse Back.jpg"
    },
    {
        "name": "Hutton's Vireo",
        "front": "Hutton's Vireo Front.jpg",
        "back": "Hutton's Vireo Back.jpg"
    },
    {
        "name": "Hooded Oriole",
        "front": "Hooded Oriole Front.jpg",
        "back": "Hooded Oriole Back.jpg"
    },
    {
        "name": "Western Bluebird",
        "front": "Western Bluebird Front.jpg",
        "back": "Western Bluebird Back.jpg"
    }
]

export const plants = [
    {
        "name": "Chamise",
        "front": "Chamise Front.jpg",
        "back": "Chamise Back.jpg"
    },
    {
        "name": "Mallow",
        "front": "Mallow Front.jpg",
        "back": "Mallow Back.jpg"
    },
    {
        "name": "Himalayan Blackberry",
        "front": "Himalayan Blackberry Front.jpg",
        "back": "Himalayan Blackberry Back.jpg"
    },
    {
        "name": "Tree Tobacco",
        "front": "Tree Tobacco Front.jpg",
        "back": "Tree Tobacco Back.jpg"
    },
    {
        "name": "Cottonwood",
        "front": "Cottonwood Front.jpg",
        "back": "Cottonwood Back.jpg"
    },
    {
        "name": "Bridal Creeper",
        "front": "Bridal Creeper Front.jpg",
        "back": "Bridal Creeper Back.jpg"
    },
    {
        "name": "African Flag",
        "front": "African Flag Front.jpg",
        "back": "African Flag Back.jpg"
    },
    {
        "name": "Beggarticks",
        "front": "Beggarticks Front.jpg",
        "back": "Beggarticks Back.jpg"
    },
    {
        "name": "Mexican Fan Palm",
        "front": "Mexican Fan Palm Front.jpg",
        "back": "Mexican Fan Palm Back.jpg"
    },
    {
        "name": "San Diego Sunflower",
        "front": "San Diego Sunflower Front.jpg",
        "back": "San Diego Sunflower Back.jpg"
    },
    {
        "name": "Coast Live Oak",
        "front": "Coast Live Oak Front.jpg",
        "back": "Coast Live Oak Back.jpg"
    },
    {
        "name": "Marsh Elder",
        "front": "Marsh Elder Front.jpg",
        "back": "Marsh Elder Back.jpg"
    },
    {
        "name": "Sweet Pea",
        "front": "Sweet Pea Front.jpg",
        "back": "Sweet Pea Back.jpg"
    },
    {
        "name": "Honeysuckle",
        "front": "Honeysuckle Front.jpg",
        "back": "Honeysuckle Back.jpg"
    },
    {
        "name": "Gooseberry",
        "front": "Gooseberry Front.jpg",
        "back": "Gooseberry Back.jpg"
    },
    {
        "name": "Umbrella Sedge",
        "front": "Umbrella Sedge Front.jpg",
        "back": "Umbrella Sedge Back.jpg"
    },
    {
        "name": "Wild Cucumber",
        "front": "Wild Cucumber Front.jpg",
        "back": "Wild Cucumber Back.jpg"
    },
    {
        "name": "Deerweed",
        "front": "Deerweed Front.jpg",
        "back": "Deerweed Back.jpg"
    },
    {
        "name": "Coyote brush",
        "front": "Coyote brush Front.jpg",
        "back": "Coyote brush Back.jpg"
    },
    {
        "name": "Brazilian Pepper",
        "front": "Brazilian Pepper Front.jpg",
        "back": "Brazilian Pepper Back.jpg"
    },
    {
        "name": "Elderberry",
        "front": "Elderberry Front.jpg",
        "back": "Elderberry Back.jpg"
    },
    {
        "name": "Mulefat",
        "front": "Mulefat Front.jpg",
        "back": "Mulefat Back.jpg"
    },
    {
        "name": "California wild rose",
        "front": "California wild rose Front.jpg",
        "back": "California wild rose Back.jpg"
    },
    {
        "name": "California Sagebrush",
        "front": "California Sagebrush Front.jpg",
        "back": "California Sagebrush Back.jpg"
    },
    {
        "name": "Pampas Grass",
        "front": "Pampas Grass Front.jpg",
        "back": "Pampas Grass Back.jpg"
    },
    {
        "name": "Blue Eyed Grass",
        "front": "Blue Eyed Grass Front.jpg",
        "back": "Blue Eyed Grass Back.jpg"
    },
    {
        "name": "Myoporum",
        "front": "Myoporum Front.jpg",
        "back": "Myoporum Back.jpg"
    },
    {
        "name": "Curly Dock",
        "front": "Curly Dock Front.jpg",
        "back": "Curly Dock Back.jpg"
    },
    {
        "name": "California buckwheat",
        "front": "California buckwheat Front.jpg",
        "back": "California buckwheat Back.jpg"
    },
    {
        "name": "Prickly Pear",
        "front": "Prickly Pear Front.jpg",
        "back": "Prickly Pear Back.jpg"
    },
    {
        "name": "Scrub Oak",
        "front": "Scrub Oak Front.jpg",
        "back": "Scrub Oak Back.jpg"
    },
    {
        "name": "Mustard",
        "front": "Mustard Front.jpg",
        "back": "Mustard Back.jpg"
    },
    {
        "name": "Jade",
        "front": "Jade Front.jpg",
        "back": "Jade Back.jpg"
    },
    {
        "name": "Golden Bush",
        "front": "Golden Bush Front.jpg",
        "back": "Golden Bush Back.jpg"
    },
    {
        "name": "Hollyleaf Cherry",
        "front": "Hollyleaf Cherry Front.jpg",
        "back": "Hollyleaf Cherry Back.jpg"
    },
    {
        "name": "Yucca",
        "front": "Yucca Front.jpg",
        "back": "Yucca Back.jpg"
    },
    {
        "name": "Spiny redberry",
        "front": "Spiny redberry Front.jpg",
        "back": "Spiny redberry Back.jpg"
    },
    {
        "name": "Stinkwort",
        "front": "Stinkwort Front.jpg",
        "back": "Stinkwort Back.jpg"
    },
    {
        "name": "Narrowleaf Milkweed",
        "front": "Narrowleaf Milkweed Front.jpg",
        "back": "Narrowleaf Milkweed Back.jpg"
    },
    {
        "name": "Yerba Mansa",
        "front": "Yerba Mansa Front.jpg",
        "back": "Yerba Mansa Back.jpg"
    },
    {
        "name": "Ice Plant",
        "front": "Ice Plant Front.jpg",
        "back": "Ice Plant Back.jpg"
    },
    {
        "name": "Black Sage",
        "front": "Black Sage Front.jpg",
        "back": "Black Sage Back.jpg"
    },
    {
        "name": "Lupine",
        "front": "Lupine Front.jpg",
        "back": "Lupine Back.jpg"
    },
    {
        "name": "Toyon",
        "front": "Toyon Front.jpg",
        "back": "Toyon Back.jpg"
    },
    {
        "name": "Thistle",
        "front": "Thistle Front.jpg",
        "back": "Thistle Back.jpg"
    },
    {
        "name": "Primrose",
        "front": "Primrose Front.jpg",
        "back": "Primrose Back.jpg"
    },
    {
        "name": "Broom baccharis",
        "front": "Broom baccharis Front.jpg",
        "back": "Broom baccharis Back.jpg"
    },
    {
        "name": "Willow",
        "front": "Willow Front.jpg",
        "back": "Willow Back.jpg"
    },
    {
        "name": "Sagewort",
        "front": "Sagewort Front.jpg",
        "back": "Sagewort Back.jpg"
    },
    {
        "name": "Golden Yarrow",
        "front": "Golden Yarrow Front.jpg",
        "back": "Golden Yarrow Back.jpg"
    },
    {
        "name": "Eucalyptus",
        "front": "Eucalyptus Front.jpg",
        "back": "Eucalyptus Back.jpg"
    },
    {
        "name": "Horehound",
        "front": "Horehound Front.jpg",
        "back": "Horehound Back.jpg"
    },
    {
        "name": "Canary Island Date Palm",
        "front": "Canary Island Date Palm Front.jpg",
        "back": "Canary Island Date Palm Back.jpg"
    },
    {
        "name": "Nightshade",
        "front": "Nightshade Front.jpg",
        "back": "Nightshade Back.jpg"
    },
    {
        "name": "Mugwort",
        "front": "Mugwort Front.jpg",
        "back": "Mugwort Back.jpg"
    },
    {
        "name": "Sycamore",
        "front": "Sycamore Front.jpg",
        "back": "Sycamore Back.jpg"
    },
    {
        "name": "Yerba Santa",
        "front": "Yerba Santa Front.jpg",
        "back": "Yerba Santa Back.jpg"
    },
    {
        "name": "Wild Rye",
        "front": "Wild Rye Front.jpg",
        "back": "Wild Rye Back.jpg"
    },
    {
        "name": "Ceanothus",
        "front": "Ceanothus Front.jpg",
        "back": "Ceanothus Back.jpg"
    },
    {
        "name": "Arundo",
        "front": "Arundo Front.jpg",
        "back": "Arundo Back.jpg"
    },
    {
        "name": "Bladderpod",
        "front": "Bladderpod Front.jpg",
        "back": "Bladderpod Back.jpg"
    },
    {
        "name": "Nasturtium",
        "front": "Nasturtium Front.jpg",
        "back": "Nasturtium Back.jpg"
    },
    {
        "name": "Blue Plumbago",
        "front": "Blue Plumbago Front.jpg",
        "back": "Blue Plumbago Back.jpg"
    },
    {
        "name": "Radish",
        "front": "Radish Front.jpg",
        "back": "Radish Back.jpg"
    },
    {
        "name": "Mission Manzanita",
        "front": "Mission Manzanita Front.jpg",
        "back": "Mission Manzanita Back.jpg"
    },
    {
        "name": "Monkeyflower",
        "front": "Monkeyflower Front.jpg",
        "back": "Monkeyflower Back.jpg"
    },
    {
        "name": "Peruvian Pepper",
        "front": "Peruvian Pepper Front.jpg",
        "back": "Peruvian Pepper Back.jpg"
    },
    {
        "name": "Cape Ivy",
        "front": "Cape Ivy Front.jpg",
        "back": "Cape Ivy Back.jpg"
    },
    {
        "name": "Cholla",
        "front": "Cholla Front.jpg",
        "back": "Cholla Back.jpg"
    },
    {
        "name": "Fennel",
        "front": "Fennel Front.jpg",
        "back": "Fennel Back.jpg"
    },
    {
        "name": "Everlasting",
        "front": "Everlasting Front.jpg",
        "back": "Everlasting Back.jpg"
    },
    {
        "name": "Cheeseweed",
        "front": "Cheeseweed Front.jpg",
        "back": "Cheeseweed Back.jpg"
    },
    {
        "name": "Poison Oak",
        "front": "Poison Oak Front.jpg",
        "back": "Poison Oak Back.jpg"
    },
    {
        "name": "California sunflower",
        "front": "California sunflower Front.jpg",
        "back": "California sunflower Back.jpg"
    },
    {
        "name": "Lemonadeberry",
        "front": "Lemonadeberry Front.jpg",
        "back": "Lemonadeberry Back.jpg"
    },
    {
        "name": "Purple Fountain Grass",
        "front": "Purple Fountain Grass Front.jpg",
        "back": "Purple Fountain Grass Back.jpg"
    },
    {
        "name": "Tarweed",
        "front": "Tarweed Front.jpg",
        "back": "Tarweed Back.jpg"
    },
    {
        "name": "Poison Hemlock",
        "front": "Poison Hemlock Front.jpg",
        "back": "Poison Hemlock Back.jpg"
    },
    {
        "name": "Acacia",
        "front": "Acacia Front.jpg",
        "back": "Acacia Back.jpg"
    },
    {
        "name": "Castor",
        "front": "Castor Front.jpg",
        "back": "Castor Back.jpg"
    },
    {
        "name": "Tamarisk",
        "front": "Tamarisk Front.jpg",
        "back": "Tamarisk Back.jpg"
    },
    {
        "name": "Ox Tongue",
        "front": "Ox Tongue Front.jpg",
        "back": "Ox Tongue Back.jpg"
    },
    {
        "name": "Laurel sumac",
        "front": "Laurel sumac Front.jpg",
        "back": "Laurel sumac Back.jpg"
    },
    {
        "name": "Crown Daisy",
        "front": "Crown Daisy Front.jpg",
        "back": "Crown Daisy Back.jpg"
    },
    {
        "name": "White Sage",
        "front": "White Sage Front.jpg",
        "back": "White Sage Back.jpg"
    }
]


export const invasives = [
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
"Eucalyptus"
]

export default function CardLists() {
  const [filter, setFilter] = useState<'plants' | 'birds' | 'both'>('both');
  const [search, setSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[data-testid="card-item"]') ?? []
    );
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? current + 1 : current - 1;
    items[next]?.focus();
  };

  const allCards = useMemo(() => {
    const cards = [];
    if (filter === 'birds' || filter === 'both') {
      cards.push(...birds);
    }
    if (filter === 'plants' || filter === 'both') {
      cards.push(...plants);
    }
    return cards.filter(card => card.name.toLowerCase().includes(search.toLowerCase()));
  }, [filter, search]);

  return (
    <main className="card-list-main">
      <div className="controls-container">
        <button type="button" className={filter === 'plants' ? 'menu-button active' : 'menu-button'} onClick={() => setFilter('plants')}>Plants</button>
        <button type="button" className={filter === 'birds' ? 'menu-button active' : 'menu-button'} onClick={() => setFilter('birds')}>Birds</button>
        <button type="button" className={filter === 'both' ? 'menu-button active' : 'menu-button'} onClick={() => setFilter('both')}>Both</button>
        <input
          type="search"
          className="search-input"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div
        className="card-list-container"
        data-testid="card-list"
        ref={listRef}
        onKeyDown={handleListKeyDown}
      >
        {allCards.map((card, index) => (
          <button
            key={index}
            className={`card-list-item ${invasives.includes(card.name) ? 'invasive' : ''}`}
            data-testid="card-item"
            data-card-name={card.name}
            onClick={() => window.location.href = `/?card=${encodeURIComponent(card.name)}`}
          >
            <img
              src={`/cards/${card.front}`}
              alt={`${card.name} front`}
              className="card-thumbnail"
            />
            <span className="card-name">{card.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}