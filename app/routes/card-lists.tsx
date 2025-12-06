import type { Route } from "./+types/card-lists";
import { useState, useMemo } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Card Lists - Flash Cards" },
    { name: "description", content: "Browse all available flash cards" },
  ];
}

export const birds = [
    {
        "name": "Acorn Woodpecker",
        "front": "Acorn Woodpecker Front.png",
        "back": "Acorn Woodpecker Back.png"
    },
    {
        "name": "American Robin",
        "front": "American Robin Front.png",
        "back": "American Robin Back.png"
    },
    {
        "name": "Northern Rough-winged Swallow",
        "front": "Northern Rough-winged Swallow Front.png",
        "back": "Northern Rough-winged Swallow Back.png"
    },
    {
        "name": "American Crow",
        "front": "American Crow Front.png",
        "back": "American Crow Back.png"
    },
    {
        "name": "Brown-headed Cowbird",
        "front": "Brown-headed Cowbird Front.png",
        "back": "Brown-headed Cowbird Back.png"
    },
    {
        "name": "Song Sparrow",
        "front": "Song Sparrow Front.png",
        "back": "Song Sparrow Back.png"
    },
    {
        "name": "Blue-gray Gnatcatcher",
        "front": "Blue-gray Gnatcatcher Front.png",
        "back": "Blue-gray Gnatcatcher Back.png"
    },
    {
        "name": "Wrentit",
        "front": "Wrentit Front.png",
        "back": "Wrentit Back.png"
    },
    {
        "name": "Rufous Hummingbird",
        "front": "Rufous Hummingbird Front.png",
        "back": "Rufous Hummingbird Back.png"
    },
    {
        "name": "Black-headed Grosbeak",
        "front": "Black-headed Grosbeak Front.png",
        "back": "Black-headed Grosbeak Back.png"
    },
    {
        "name": "Greater Roadrunner",
        "front": "Greater Roadrunner Front.png",
        "back": "Greater Roadrunner Back.png"
    },
    {
        "name": "Ash-throated Flycatcher",
        "front": "Ash-throated Flycatcher Front.png",
        "back": "Ash-throated Flycatcher Back.png"
    },
    {
        "name": "Cassin_s Kingbird",
        "front": "Cassin_s Kingbird Front.png",
        "back": "Cassin_s Kingbird Back.png"
    },
    {
        "name": "Mourning Dove",
        "front": "Mourning Dove Front.png",
        "back": "Mourning Dove Back.png"
    },
    {
        "name": "Downy Woodpecker",
        "front": "Downy Woodpecker Front.png",
        "back": "Downy Woodpecker Back.png"
    },
    {
        "name": "Cliff Swallow",
        "front": "Cliff Swallow Front.png",
        "back": "Cliff Swallow Back.png"
    },
    {
        "name": "Ruby-crowned Kinglet",
        "front": "Ruby-crowned Kinglet Front.png",
        "back": "Ruby-crowned Kinglet Back.png"
    },
    {
        "name": "Spotted Towhee",
        "front": "Spotted Towhee Front.png",
        "back": "Spotted Towhee Back.png"
    },
    {
        "name": "Black Phoebe",
        "front": "Black Phoebe Front.png",
        "back": "Black Phoebe Back.png"
    },
    {
        "name": "House Finch",
        "front": "House Finch Front.png",
        "back": "House Finch Back.png"
    },
    {
        "name": "Bird Flashcards",
        "front": "Bird Flashcards Front.png",
        "back": "Bird Flashcards Back.png"
    },
    {
        "name": "Red-tailed Hawk",
        "front": "Red-tailed Hawk Front.png",
        "back": "Red-tailed Hawk Back.png"
    },
    {
        "name": "Band-tailed Pigeon",
        "front": "Band-tailed Pigeon Front.png",
        "back": "Band-tailed Pigeon Back.png"
    },
    {
        "name": "Lesser Goldfinch",
        "front": "Lesser Goldfinch Front.png",
        "back": "Lesser Goldfinch Back.png"
    },
    {
        "name": "Red-winged Blackbird",
        "front": "Red-winged Blackbird Front.png",
        "back": "Red-winged Blackbird Back.png"
    },
    {
        "name": "White-breasted Nuthatch",
        "front": "White-breasted Nuthatch Front.png",
        "back": "White-breasted Nuthatch Back.png"
    },
    {
        "name": "Western Tanager",
        "front": "Western Tanager Front.png",
        "back": "Western Tanager Back.png"
    },
    {
        "name": "Turkey Vulture",
        "front": "Turkey Vulture Front.png",
        "back": "Turkey Vulture Back.png"
    },
    {
        "name": "California Quail",
        "front": "California Quail Front.png",
        "back": "California Quail Back.png"
    },
    {
        "name": "White-crowned Sparrow",
        "front": "White-crowned Sparrow Front.png",
        "back": "White-crowned Sparrow Back.png"
    },
    {
        "name": "Yellow Warbler",
        "front": "Yellow Warbler Front.png",
        "back": "Yellow Warbler Back.png"
    },
    {
        "name": "Northern Mockingbird",
        "front": "Northern Mockingbird Front.png",
        "back": "Northern Mockingbird Back.png"
    },
    {
        "name": "Say_s Phoebe",
        "front": "Say_s Phoebe Front.png",
        "back": "Say_s Phoebe Back.png"
    },
    {
        "name": "House Sparrow",
        "front": "House Sparrow Front.png",
        "back": "House Sparrow Back.png"
    },
    {
        "name": "Cooper_s Hawk",
        "front": "Cooper_s Hawk Front.png",
        "back": "Cooper_s Hawk Back.png"
    },
    {
        "name": "California Towhee",
        "front": "California Towhee Front.png",
        "back": "California Towhee Back.png"
    },
    {
        "name": "Bushtit",
        "front": "Bushtit Front.png",
        "back": "Bushtit Back.png"
    },
    {
        "name": "California Scrub Jay",
        "front": "California Scrub Jay Front.png",
        "back": "California Scrub Jay Back.png"
    },
    {
        "name": "Nuttall_s Woodpecker",
        "front": "Nuttall_s Woodpecker Front.png",
        "back": "Nuttall_s Woodpecker Back.png"
    },
    {
        "name": "Allen_s Hummingbird",
        "front": "Allen_s Hummingbird Front.png",
        "back": "Allen_s Hummingbird Back.png"
    },
    {
        "name": "Northern Flicker",
        "front": "Northern Flicker Front.png",
        "back": "Northern Flicker Back.png"
    },
    {
        "name": "Dark-eyed Junco",
        "front": "Dark-eyed Junco Front.png",
        "back": "Dark-eyed Junco Back.png"
    },
    {
        "name": "Bewick_s Wren",
        "front": "Bewick_s Wren Front.png",
        "back": "Bewick_s Wren Back.png"
    },
    {
        "name": "European Starling",
        "front": "European Starling Front.png",
        "back": "European Starling Back.png"
    },
    {
        "name": "Yellow-rumped Warbler",
        "front": "Yellow-rumped Warbler Front.png",
        "back": "Yellow-rumped Warbler Back.png"
    },
    {
        "name": "Anna_s Hummingbird",
        "front": "Anna_s Hummingbird Front.png",
        "back": "Anna_s Hummingbird Back.png"
    },
    {
        "name": "Western Flycatcher",
        "front": "Western Flycatcher Front.png",
        "back": "Western Flycatcher Back.png"
    },
    {
        "name": "Scaly-breasted Munia",
        "front": "Scaly-breasted Munia Front.png",
        "back": "Scaly-breasted Munia Back.png"
    },
    {
        "name": "Common Yellowthroat",
        "front": "Common Yellowthroat Front.png",
        "back": "Common Yellowthroat Back.png"
    },
    {
        "name": "Wilson_s Warbler",
        "front": "Wilson_s Warbler Front.png",
        "back": "Wilson_s Warbler Back.png"
    },
    {
        "name": "Red-shouldered Hawk",
        "front": "Red-shouldered Hawk Front.png",
        "back": "Red-shouldered Hawk Back.png"
    },
    {
        "name": "Least Bell_s Vireo",
        "front": "Least Bell_s Vireo Front.png",
        "back": "Least Bell_s Vireo Back.png"
    },
    {
        "name": "Townsend_s Warbler",
        "front": "Townsend_s Warbler Front.png",
        "back": "Townsend_s Warbler Back.png"
    },
    {
        "name": "Orange-crowned Warbler",
        "front": "Orange-crowned Warbler Front.png",
        "back": "Orange-crowned Warbler Back.png"
    },
    {
        "name": "Coastal Cactus Wren",
        "front": "Coastal Cactus Wren Front.png",
        "back": "Coastal Cactus Wren Back.png"
    },
    {
        "name": "Western Meadowlark",
        "front": "Western Meadowlark Front.png",
        "back": "Western Meadowlark Back.png"
    },
    {
        "name": "Eurasian Collared Dove",
        "front": "Eurasian Collared Dove Front.png",
        "back": "Eurasian Collared Dove Back.png"
    },
    {
        "name": "Light-footed Ridgeway_s Rail",
        "front": "Light-footed Ridgeway_s Rail Front.png",
        "back": "Light-footed Ridgeway_s Rail Back.png"
    },
    {
        "name": "Cedar Waxwing",
        "front": "Cedar Waxwing Front.png",
        "back": "Cedar Waxwing Back.png"
    },
    {
        "name": "Coastal California Gnatcatcher",
        "front": "Coastal California Gnatcatcher Front.png",
        "back": "Coastal California Gnatcatcher Back.png"
    },
    {
        "name": "American Kestrel",
        "front": "American Kestrel Front.png",
        "back": "American Kestrel Back.png"
    },
    {
        "name": "Common Raven",
        "front": "Common Raven Front.png",
        "back": "Common Raven Back.png"
    },
    {
        "name": "Northern House Wren",
        "front": "Northern House Wren Front.png",
        "back": "Northern House Wren Back.png"
    },
    {
        "name": "Western Barn Owl",
        "front": "Western Barn Owl Front.png",
        "back": "Western Barn Owl Back.png"
    },
    {
        "name": "California Thrasher",
        "front": "California Thrasher Front.png",
        "back": "California Thrasher Back.png"
    },
    {
        "name": "Great Horned Owl",
        "front": "Great Horned Owl Front.png",
        "back": "Great Horned Owl Back.png"
    },
    {
        "name": "Oak Titmouse",
        "front": "Oak Titmouse Front.png",
        "back": "Oak Titmouse Back.png"
    },
    {
        "name": "Hutton_s Vireo",
        "front": "Hutton_s Vireo Front.png",
        "back": "Hutton_s Vireo Back.png"
    },
    {
        "name": "Hooded Oriole",
        "front": "Hooded Oriole Front.png",
        "back": "Hooded Oriole Back.png"
    },
    {
        "name": "Western Bluebird",
        "front": "Western Bluebird Front.png",
        "back": "Western Bluebird Back.png"
    }
]

export const plants = [
    {
        "name": "Chamise",
        "front": "Chamise Front.png",
        "back": "Chamise Back.png"
    },
    {
        "name": "Mallow",
        "front": "Mallow Front.png",
        "back": "Mallow Back.png"
    },
    {
        "name": "Himalayan Blackberry",
        "front": "Himalayan Blackberry Front.png",
        "back": "Himalayan Blackberry Back.png"
    },
    {
        "name": "Tree Tobacco",
        "front": "Tree Tobacco Front.png",
        "back": "Tree Tobacco Back.png"
    },
    {
        "name": "Cottonwood",
        "front": "Cottonwood Front.png",
        "back": "Cottonwood Back.png"
    },
    {
        "name": "Bridal Creeper",
        "front": "Bridal Creeper Front.png",
        "back": "Bridal Creeper Back.png"
    },
    {
        "name": "African Flag",
        "front": "African Flag Front.png",
        "back": "African Flag Back.png"
    },
    {
        "name": "Beggarticks",
        "front": "Beggarticks Front.png",
        "back": "Beggarticks Back.png"
    },
    {
        "name": "Mexican Fan Palm",
        "front": "Mexican Fan Palm Front.png",
        "back": "Mexican Fan Palm Back.png"
    },
    {
        "name": "San Diego Sunflower",
        "front": "San Diego Sunflower Front.png",
        "back": "San Diego Sunflower Back.png"
    },
    {
        "name": "Coast Live Oak",
        "front": "Coast Live Oak Front.png",
        "back": "Coast Live Oak Back.png"
    },
    {
        "name": "Marsh Elder",
        "front": "Marsh Elder Front.png",
        "back": "Marsh Elder Back.png"
    },
    {
        "name": "Sweet Pea",
        "front": "Sweet Pea Front.png",
        "back": "Sweet Pea Back.png"
    },
    {
        "name": "Honeysuckle",
        "front": "Honeysuckle Front.png",
        "back": "Honeysuckle Back.png"
    },
    {
        "name": "Gooseberry",
        "front": "Gooseberry Front.png",
        "back": "Gooseberry Back.png"
    },
    {
        "name": "Umbrella Sedge",
        "front": "Umbrella Sedge Front.png",
        "back": "Umbrella Sedge Back.png"
    },
    {
        "name": "Wild Cucumber",
        "front": "Wild Cucumber Front.png",
        "back": "Wild Cucumber Back.png"
    },
    {
        "name": "Deerweed",
        "front": "Deerweed Front.png",
        "back": "Deerweed Back.png"
    },
    {
        "name": "Coyote brush",
        "front": "Coyote brush Front.png",
        "back": "Coyote brush Back.png"
    },
    {
        "name": "Brazilian Pepper",
        "front": "Brazilian Pepper Front.png",
        "back": "Brazilian Pepper Back.png"
    },
    {
        "name": "Elderberry",
        "front": "Elderberry Front.png",
        "back": "Elderberry Back.png"
    },
    {
        "name": "Mulefat",
        "front": "Mulefat Front.png",
        "back": "Mulefat Back.png"
    },
    {
        "name": "California wild rose",
        "front": "California wild rose Front.png",
        "back": "California wild rose Back.png"
    },
    {
        "name": "California Sagebrush",
        "front": "California Sagebrush Front.png",
        "back": "California Sagebrush Back.png"
    },
    {
        "name": "Pampas Grass",
        "front": "Pampas Grass Front.png",
        "back": "Pampas Grass Back.png"
    },
    {
        "name": "Blue Eyed Grass",
        "front": "Blue Eyed Grass Front.png",
        "back": "Blue Eyed Grass Back.png"
    },
    {
        "name": "Myoporum",
        "front": "Myoporum Front.png",
        "back": "Myoporum Back.png"
    },
    {
        "name": "Curly Dock",
        "front": "Curly Dock Front.png",
        "back": "Curly Dock Back.png"
    },
    {
        "name": "California buckwheat",
        "front": "California buckwheat Front.png",
        "back": "California buckwheat Back.png"
    },
    {
        "name": "Prickly Pear",
        "front": "Prickly Pear Front.png",
        "back": "Prickly Pear Back.png"
    },
    {
        "name": "Scrub Oak",
        "front": "Scrub Oak Front.png",
        "back": "Scrub Oak Back.png"
    },
    {
        "name": "Mustard",
        "front": "Mustard Front.png",
        "back": "Mustard Back.png"
    },
    {
        "name": "Jade",
        "front": "Jade Front.png",
        "back": "Jade Back.png"
    },
    {
        "name": "Golden Bush",
        "front": "Golden Bush Front.png",
        "back": "Golden Bush Back.png"
    },
    {
        "name": "Hollyleaf Cherry",
        "front": "Hollyleaf Cherry Front.png",
        "back": "Hollyleaf Cherry Back.png"
    },
    {
        "name": "Yucca",
        "front": "Yucca Front.png",
        "back": "Yucca Back.png"
    },
    {
        "name": "Spiny redberry",
        "front": "Spiny redberry Front.png",
        "back": "Spiny redberry Back.png"
    },
    {
        "name": "Stinkwort",
        "front": "Stinkwort Front.png",
        "back": "Stinkwort Back.png"
    },
    {
        "name": "Narrowleaf Milkweed",
        "front": "Narrowleaf Milkweed Front.png",
        "back": "Narrowleaf Milkweed Back.png"
    },
    {
        "name": "Yerba Mansa",
        "front": "Yerba Mansa Front.png",
        "back": "Yerba Mansa Back.png"
    },
    {
        "name": "Ice Plant",
        "front": "Ice Plant Front.png",
        "back": "Ice Plant Back.png"
    },
    {
        "name": "Black Sage",
        "front": "Black Sage Front.png",
        "back": "Black Sage Back.png"
    },
    {
        "name": "Lupine",
        "front": "Lupine Front.png",
        "back": "Lupine Back.png"
    },
    {
        "name": "Toyon",
        "front": "Toyon Front.png",
        "back": "Toyon Back.png"
    },
    {
        "name": "Thistle",
        "front": "Thistle Front.png",
        "back": "Thistle Back.png"
    },
    {
        "name": "Primrose",
        "front": "Primrose Front.png",
        "back": "Primrose Back.png"
    },
    {
        "name": "Broom baccharis",
        "front": "Broom baccharis Front.png",
        "back": "Broom baccharis Back.png"
    },
    {
        "name": "Willow",
        "front": "Willow Front.png",
        "back": "Willow Back.png"
    },
    {
        "name": "Sagewort",
        "front": "Sagewort Front.png",
        "back": "Sagewort Back.png"
    },
    {
        "name": "Golden Yarrow",
        "front": "Golden Yarrow Front.png",
        "back": "Golden Yarrow Back.png"
    },
    {
        "name": "Eucalyptus",
        "front": "Eucalyptus Front.png",
        "back": "Eucalyptus Back.png"
    },
    {
        "name": "Horehound",
        "front": "Horehound Front.png",
        "back": "Horehound Back.png"
    },
    {
        "name": "Canary Island Date Palm",
        "front": "Canary Island Date Palm Front.png",
        "back": "Canary Island Date Palm Back.png"
    },
    {
        "name": "Nightshade",
        "front": "Nightshade Front.png",
        "back": "Nightshade Back.png"
    },
    {
        "name": "Mugwort",
        "front": "Mugwort Front.png",
        "back": "Mugwort Back.png"
    },
    {
        "name": "Sycamore",
        "front": "Sycamore Front.png",
        "back": "Sycamore Back.png"
    },
    {
        "name": "Yerba Santa",
        "front": "Yerba Santa Front.png",
        "back": "Yerba Santa Back.png"
    },
    {
        "name": "Wild Rye",
        "front": "Wild Rye Front.png",
        "back": "Wild Rye Back.png"
    },
    {
        "name": "Ceanothus",
        "front": "Ceanothus Front.png",
        "back": "Ceanothus Back.png"
    },
    {
        "name": "Arundo",
        "front": "Arundo Front.png",
        "back": "Arundo Back.png"
    },
    {
        "name": "Bladderpod",
        "front": "Bladderpod Front.png",
        "back": "Bladderpod Back.png"
    },
    {
        "name": "Nasturtium",
        "front": "Nasturtium Front.png",
        "back": "Nasturtium Back.png"
    },
    {
        "name": "Blue Plumbago",
        "front": "Blue Plumbago Front.png",
        "back": "Blue Plumbago Back.png"
    },
    {
        "name": "Radish",
        "front": "Radish Front.png",
        "back": "Radish Back.png"
    },
    {
        "name": "Mission Manzanita",
        "front": "Mission Manzanita Front.png",
        "back": "Mission Manzanita Back.png"
    },
    {
        "name": "Monkeyflower",
        "front": "Monkeyflower Front.png",
        "back": "Monkeyflower Back.png"
    },
    {
        "name": "Peruvian Pepper",
        "front": "Peruvian Pepper Front.png",
        "back": "Peruvian Pepper Back.png"
    },
    {
        "name": "Cape Ivy",
        "front": "Cape Ivy Front.png",
        "back": "Cape Ivy Back.png"
    },
    {
        "name": "Cholla",
        "front": "Cholla Front.png",
        "back": "Cholla Back.png"
    },
    {
        "name": "Fennel",
        "front": "Fennel Front.png",
        "back": "Fennel Back.png"
    },
    {
        "name": "Everlasting",
        "front": "Everlasting Front.png",
        "back": "Everlasting Back.png"
    },
    {
        "name": "Cheeseweed",
        "front": "Cheeseweed Front.png",
        "back": "Cheeseweed Back.png"
    },
    {
        "name": "Poison Oak",
        "front": "Poison Oak Front.png",
        "back": "Poison Oak Back.png"
    },
    {
        "name": "California sunflower",
        "front": "California sunflower Front.png",
        "back": "California sunflower Back.png"
    },
    {
        "name": "Lemonadeberry",
        "front": "Lemonadeberry Front.png",
        "back": "Lemonadeberry Back.png"
    },
    {
        "name": "Purple Fountain Grass",
        "front": "Purple Fountain Grass Front.png",
        "back": "Purple Fountain Grass Back.png"
    },
    {
        "name": "Tarweed",
        "front": "Tarweed Front.png",
        "back": "Tarweed Back.png"
    },
    {
        "name": "Poison Hemlock",
        "front": "Poison Hemlock Front.png",
        "back": "Poison Hemlock Back.png"
    },
    {
        "name": "Acacia",
        "front": "Acacia Front.png",
        "back": "Acacia Back.png"
    },
    {
        "name": "Castor",
        "front": "Castor Front.png",
        "back": "Castor Back.png"
    },
    {
        "name": "Tamarisk",
        "front": "Tamarisk Front.png",
        "back": "Tamarisk Back.png"
    },
    {
        "name": "Ox Tongue",
        "front": "Ox Tongue Front.png",
        "back": "Ox Tongue Back.png"
    },
    {
        "name": "Laurel sumac",
        "front": "Laurel sumac Front.png",
        "back": "Laurel sumac Back.png"
    },
    {
        "name": "Crown Daisy",
        "front": "Crown Daisy Front.png",
        "back": "Crown Daisy Back.png"
    },
    {
        "name": "White Sage",
        "front": "White Sage Front.png",
        "back": "White Sage Back.png"
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
      <div className="card-list-container" data-testid="card-list">
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