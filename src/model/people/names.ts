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