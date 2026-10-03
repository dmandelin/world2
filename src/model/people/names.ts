import { chooseFrom } from "../lib/basics";

const HAMLET_NAMES: string[] = [
  "Urdu", "Nabi", "Telu", "Asur", "Duma", "Zira", "Enlu", "Naga",
  "Kish", "Bazu", "Luru", "Shen", "Isil", "Tani", "Umba", "Nudu",
  "Gazu", "Piru", "Sabu", "Ilum", "Daga", "Niri", "Zala", "Melu",
  "Batu", "Kuma", "Arin", "Saka", "Turu", "Zimu", "Beli", "Neta",
  "Duru", "Ramu", "Taba", "Enna", "Urin", "Zaku", "Lama", "Shul",
  "Igal", "Ubar", "Eresh", "Amit", "Napa", "Mazi", "Balu", "Ziti",
  "Tusa", "Kira", "Zaba", "Ilga", "Shen", "Omar", "Tepi", "Usha",
  "Nali", "Daza", "Baru", "Ulli", "Zira", "Buzu", "Nura", "Kuli",
  "Sari", "Mena", "Tumi", "Zira", "Pazi", "Nera", "Igzi", "Taza",
  "Kidu", "Sipa", "Lulu", "Zuli", "Akun", "Urmu", "Shen", "Razi",
  "Ishu", "Udug", "Nanu", "Ekur", "Zidi", "Tiri", "Balz", "Ruma",
  "Zata", "Enku", "Shib", "Amul", "Nema", "Uzin", "Tani", "Kuzu",
  "Urzi", "Zapu", "Emdu", "Gali", "Lapi", "Inur", "Talu", "Sipu",
  "Arzu", "Kazi", "Belu", "Zemu", "Amar", "Nilu", "Razu", "Tima",
  "Gari", "Suzu", "Unur", "Kari", "Duli", "Zupu", "Iram", "Tuki",
  "Shan", "Nima", "Uman", "Lazu", "Paku", "Omzi", "Tazu", "Sima"
];

// Clan name sets. Each should have enough names that clans rarely need to repeat.
export type ClanNameSet = readonly string[];

// Sumerian- and Akkadian-flavored names.
export const SUMERIAN_CLAN_NAMES: ClanNameSet = [
  "Abzu", "Adab", "Akkad", "Akkul", "Akkur", "Alulim", "Amurru", "Anzu", "Apin", "Aratta", "Asarlu",
  "Baba", "Babil", "Badtib", "Balag", "Baqal", "Bilga", "Birdu", "Borum",
  "Dagan", "Dagul", "Dilmun", "Dirig", "Dudum", "Dukug", "Dumuz", "Dumuzi", "Dunnum",
  "Eana", "Ebih", "Ekiq", "Elam", "Emar", "Enki", "Enlil", "Enmer", "Entem", "Eridu", "Eshnun", "Ezen", "Ezina",
  "Gala", "Garama", "Gatum", "Geshtin", "Gibil", "Gigir", "Gilgam", "Gipar", "Girsu", "Gubba", "Gudea", "Gulla",
  "Halab", "Hanam", "Hanish", "Haran", "Hashur", "Hattu", "Hurum", "Huzir",
  "Ibgal", "Idnin", "Igigi", "Igimil", "Ikunum", "Ilum", "Imdug", "Imgur", "Imiru", "Inanna", "Irigal", "Ishkur", "Ishmu", "Ishtar", "Isin",
  "Kadi", "Kakka", "Kalar", "Kanesh", "Karum", "Kesh", "Kigdu", "Kish", "Kubaba", "Kudul", "Kulaba", "Kurum",
  "Lagash", "Lahar", "Larsa", "Libal", "Lilum", "Limmul", "Lugal", "Lulal", "Lullu",
  "Mada", "Mami", "Marduk", "Mari", "Martu", "Mashash", "Meluhha", "Mushus",
  "Nabu", "Nadin", "Nammu", "Namtar", "Namzu", "Nanna", "Nanib", "Nanshe", "Naram", "Naza", "Nedu", "Nidaba", "Nigir", "Nungal",
  "Pabil", "Pukku", "Purum", "Pushu", "Puzur",
  "Raba", "Ridan", "Rimush", "Rusa",
  "Saba", "Sabum", "Sagan", "Samug", "Sangar", "Sarpan", "Shagir", "Shakan", "Shaku", "Shalim", "Shamash", "Shara", "Shuba", "Shudu", "Shurupp", "Subar", "Sulgi", "Sumer",
  "Tabra", "Tarzu", "Teshk", "Tiamat", "Tidnu", "Tigris", "Tilla", "Tirum", "Tugul", "Tukki", "Tummal", "Tura",
  "Ubara", "Umma", "Umu", "Unug", "Urdu", "Urnin", "Ursag", "Urshu", "Ursim", "Utu", "Uzu",
  "Zabala", "Zabum", "Zagros", "Zalki", "Zame", "Zamug", "Zarku", "Ziusud", "Zudil", "Zudu", "Zulum", "Zuzu",
];

// English names for flora, fauna, stone, land, water, and craft of Southern
// Mesopotamia and its neighbors, 7000-5000 BC. Easier to remember and track.
export const NATURE_CLAN_NAMES: ClanNameSet = [
  // Fauna
  "Onager", "Aurochs", "Gazelle", "Ibex", "Boar", "Lion", "Leopard", "Cheetah", "Jackal",
  "Wolf", "Fox", "Hyena", "Badger", "Otter", "Hare", "Hedgehog", "Jerboa", "Mongoose",
  "Wildcat", "Bear", "Stag", "Ram", "Goat", "Bull", "Hound",
  // Birds
  "Heron", "Egret", "Stork", "Crane", "Pelican", "Ibis", "Flamingo", "Cormorant",
  "Kingfisher", "Ostrich", "Bustard", "Partridge", "Francolin", "Sandgrouse", "Dove",
  "Raven", "Vulture", "Eagle", "Falcon", "Owl", "Kite", "Hoopoe", "Swallow", "Lark", "Goose",
  "Bittern", "Plover",
  // Fish, reptiles, and small creatures
  "Carp", "Catfish", "Turtle", "Tortoise", "Crab", "Mussel", "Snail", "Frog", "Viper",
  "Lizard", "Scorpion", "Locust", "Bee", "Wasp", "Beetle", "Dragonfly", "Spider", "Dugong",
  "Dolphin",
  // Flora
  "Reed", "Rush", "Sedge", "Cattail", "Tamarisk", "Poplar", "Willow", "Licorice", "Palm",
  "Barley", "Emmer", "Flax", "Lentil", "Chickpea", "Vetch", "Pistachio", "Almond", "Oak",
  "Terebinth", "Juniper", "Fig", "Caper", "Saltbush", "Camelthorn", "Thistle", "Wormwood",
  "Mallow", "Vine", "Pomegranate", "Briar", "Hawthorn", "Acacia", "Jujube",
  // Rocks and minerals
  "Flint", "Chert", "Obsidian", "Bitumen", "Clay", "Ochre", "Basalt", "Gypsum", "Alabaster",
  "Salt", "Carnelian", "Turquoise", "Malachite", "Copper", "Lapis", "Jasper", "Agate",
  "Quartz", "Marble", "Steatite", "Hematite", "Pebble", "Gravel",
  // Landforms
  "Dune", "Tell", "Ridge", "Bluff", "Gorge", "Wadi", "Steppe", "Crag", "Cliff", "Cave",
  "Ravine", "Knoll", "Scarp", "Pass", "Peak", "Levee", "Shoal", "Islet", "Delta",
  // Waters
  "Marsh", "Fen", "Lagoon", "Spring", "Brook", "Creek", "Ford", "Eddy", "Estuary", "Oasis",
  "Tide", "Flood",
  // Tools and works
  "Sickle", "Quern", "Pestle", "Adze", "Awl", "Spindle", "Loom", "Sling", "Bow", "Spear",
  "Net", "Basket", "Jar", "Bowl", "Kiln", "Hearth", "Hoe", "Raft", "Paddle", "Canal",
  "Brick", "Seal", "Bead",
];

// The name set new clans draw from.
const CLAN_NAMES: ClanNameSet = NATURE_CLAN_NAMES;

export function randomClanName(exclude: string[] | Set<String>): string {
  if (Array.isArray(exclude)) exclude = new Set(exclude);
  const available = CLAN_NAMES.filter(name => !exclude.has(name));
  if (available.length === 0) {
    return CLAN_NAMES[Math.floor(Math.random() * CLAN_NAMES.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

// Personal names, for the ancestors a clan remembers.
const ANCESTOR_NAMES: string[] = [
  "Abba", "Adda", "Akalla", "Amagi", "Ammu", "Anni", "Baragi", "Bazi",
  "Dada", "Dudu", "Ekimu", "Ennu", "Ezi", "Gemeti", "Gishu", "Hala",
  "Ibbi", "Idda", "Ilalu", "Innin", "Ishma", "Kabta", "Kikku", "Kuda",
  "Lalla", "Lugi", "Lumma", "Mamu", "Menna", "Mesi", "Nanni", "Nia",
  "Ninna", "Nisa", "Nuzi", "Pilu", "Puzi", "Rimma", "Sagga", "Shesh",
  "Shuni", "Sinna", "Tabbi", "Tulla", "Ubbu", "Ulla", "Ummi", "Urra",
  "Zabi", "Zikku", "Zummi", "Ashu", "Belli", "Dimma", "Ezina", "Gagu",
  "Hunzu", "Ilsu", "Kalki", "Mudu", "Namma", "Ruti", "Saggu", "Tiddu",
];

// Two different names, for the two ancestors at the head of a line.
export function randomAncestorPair(): [string, string] {
  const first = chooseFrom(ANCESTOR_NAMES);
  let second = chooseFrom(ANCESTOR_NAMES);
  while (second === first) second = chooseFrom(ANCESTOR_NAMES);
  return [first, second];
}

export function randomHamletName(): string {
  if (!HAMLET_NAMES.length) {
    const i = Math.floor(Math.random() * 900000) + 100000;
    return `Hamlet-${i}`;
  }

  return chooseFrom(HAMLET_NAMES, true);
}