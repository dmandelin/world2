// Community structure of a small weighted, undirected graph: which nodes clump
// together, and how much more than chance. Used by the settlement's Cliques
// panel, where the nodes are clans and the weights are some tie between them.
//
// Weights are a symmetric matrix with a zero diagonal and no negative entries;
// w[i][j] is how strongly i and j are tied.
//
// The measure is Newman's modularity,
//
//     Q = (1 / 2m) * sum_ij (w_ij - k_i k_j / 2m) [i and j in the same group]
//
// where k_i is i's total tie weight and 2m the sum of all of them: the share
// of tie weight that falls inside groups, less the share that would if every
// node spread its ties at random in proportion to the others' totals. 0 is no
// more clumping than chance; real networks with clear communities run from
// about 0.3 up. Groups are found by the Louvain method, which greedily moves
// nodes to whichever neighboring group raises Q most, then merges each group
// into one node and repeats.
//
// Modularity is biased upward for small graphs -- any partition of a few
// nodes finds some structure -- so `shuffledModularity` gives the same
// measure for the same tie weights dealt out to random pairs, as a baseline.

export type Weights = readonly (readonly number[])[];

function totals(w: Weights): number[] {
    return w.map(row => row.reduce((a, b) => a + b, 0));
}

export function modularity(w: Weights, groups: readonly number[]): number {
    const k = totals(w);
    const m2 = k.reduce((a, b) => a + b, 0);
    if (!(m2 > 0)) return 0;
    let q = 0;
    for (let i = 0; i < w.length; ++i) {
        for (let j = 0; j < w.length; ++j) {
            if (groups[i] !== groups[j]) continue;
            q += w[i][j] - k[i] * k[j] / m2;
        }
    }
    return q / m2;
}

// Share of all tie weight that falls inside groups, and the share expected
// by chance. Modularity is the first less the second.
export function withinShare(w: Weights, groups: readonly number[]): { actual: number, expected: number } {
    const k = totals(w);
    const m2 = k.reduce((a, b) => a + b, 0);
    if (!(m2 > 0)) return { actual: 0, expected: 0 };
    let inside = 0;
    const groupTotal = new Map<number, number>();
    for (let i = 0; i < w.length; ++i) {
        groupTotal.set(groups[i], (groupTotal.get(groups[i]) ?? 0) + k[i]);
        for (let j = 0; j < w.length; ++j) {
            if (groups[i] === groups[j]) inside += w[i][j];
        }
    }
    let expected = 0;
    for (const t of groupTotal.values()) expected += (t / m2) ** 2;
    return { actual: inside / m2, expected };
}

// Renumber groups 0, 1, 2... in order of first appearance.
function renumber(groups: readonly number[]): number[] {
    const ids = new Map<number, number>();
    return groups.map(g => {
        let id = ids.get(g);
        if (id === undefined) ids.set(g, id = ids.size);
        return id;
    });
}

// One Louvain level: move each node to the neighboring group that raises
// modularity most, until no move helps. Diagonal entries are the weight a
// merged node carries inside itself, and stay with it.
function localMoves(w: Weights): number[] {
    const n = w.length;
    const k = totals(w);
    const m2 = k.reduce((a, b) => a + b, 0);
    const group = Array.from({ length: n }, (_, i) => i);
    if (!(m2 > 0)) return group;
    const groupTotal = [...k];

    for (let pass = 0; pass < 100; ++pass) {
        let moved = false;
        for (let i = 0; i < n; ++i) {
            const from = group[i];
            groupTotal[from] -= k[i];

            // Tie weight from i into each group it touches.
            const into = new Map<number, number>();
            for (let j = 0; j < n; ++j) {
                if (j === i || !(w[i][j] > 0)) continue;
                into.set(group[j], (into.get(group[j]) ?? 0) + w[i][j]);
            }

            // Gain of joining group c, up to a factor common to all of them.
            const gain = (c: number) =>
                (into.get(c) ?? 0) - groupTotal[c] * k[i] / m2;
            let best = from;
            let bestGain = gain(from);
            for (const c of into.keys()) {
                const g = gain(c);
                if (g > bestGain + 1e-12) {
                    best = c;
                    bestGain = g;
                }
            }

            groupTotal[best] += k[i];
            if (best !== from) {
                group[i] = best;
                moved = true;
            }
        }
        if (!moved) break;
    }
    return renumber(group);
}

// Each group merged into one node, its internal ties on the diagonal.
function aggregate(w: Weights, groups: readonly number[]): number[][] {
    const size = Math.max(-1, ...groups) + 1;
    const out = Array.from({ length: size }, () => new Array<number>(size).fill(0));
    for (let i = 0; i < w.length; ++i) {
        for (let j = 0; j < w.length; ++j) {
            out[groups[i]][groups[j]] += w[i][j];
        }
    }
    return out;
}

// Groups by the Louvain method: one group number per node, numbered from 0.
export function louvain(w: Weights): number[] {
    let membership = Array.from({ length: w.length }, (_, i) => i);
    let graph: Weights = w;
    for (let level = 0; level < 20; ++level) {
        const groups = localMoves(graph);
        const count = Math.max(-1, ...groups) + 1;
        if (count === graph.length) break;
        membership = membership.map(node => groups[node]);
        graph = aggregate(graph, groups);
    }
    return renumber(membership);
}

// A small seeded generator, so the baseline comes out the same each time the
// panel draws.
function seededRandom(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Mean modularity Louvain finds when the same tie weights are dealt out to
// random pairs: how much clumping a graph of this size and spread of weights
// shows by chance alone.
export function shuffledModularity(w: Weights, trials: number = 20, seed: number = 1): number {
    const n = w.length;
    if (n < 3) return 0;
    const pairs: [number, number][] = [];
    const values: number[] = [];
    for (let i = 0; i < n; ++i) {
        for (let j = i + 1; j < n; ++j) {
            pairs.push([i, j]);
            values.push(w[i][j]);
        }
    }
    const random = seededRandom(seed);
    let total = 0;
    for (let t = 0; t < trials; ++t) {
        for (let a = values.length - 1; a > 0; --a) {
            const b = Math.floor(random() * (a + 1));
            [values[a], values[b]] = [values[b], values[a]];
        }
        const shuffled = Array.from({ length: n }, () => new Array<number>(n).fill(0));
        pairs.forEach(([i, j], p) => {
            shuffled[i][j] = values[p];
            shuffled[j][i] = values[p];
        });
        total += modularity(shuffled, louvain(shuffled));
    }
    return total / trials;
}
