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
  "Shan", "Niga", "Uman", "Lazu", "Paku", "Omzi", "Tazu", "Sima"
];

export function randomHamletName(): string {
    if (!HAMLET_NAMES.length) {
        const i = Math.floor(Math.random() * 900000) + 100000;
        return `Hamlet-${i}`;
    }

    return chooseFrom(HAMLET_NAMES, true);
}