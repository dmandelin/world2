export class Clan {
    constructor(
        readonly name: string,
        public size: number,
        public skill: number = 2,
    ) {
        const share = Math.floor(size / 6);
        this.slices[0][0] = this.slices[0][1] = share;
        this.slices[1][0] = this.slices[1][1] = Math.floor(0.8 * share);
        this.slices[2][0] = this.slices[2][1] = Math.floor(0.7 * share);
        this.slices[3][0] = this.slices[3][1] = Math.floor(0.5 * share);
        const remainder = size - this.slicesTotal;
        this.slices[0][0] += Math.floor(remainder / 2);
        this.slices[0][1] += Math.floor((remainder + 1) / 2);
    }

    readonly slices: number[][] = [
        [0, 0], // Children, girls first (0-18)
        [0, 0], // Adults (18-35)
        [0, 0], // Seniors (35-55)
        [0, 0], // Elders (55+)
    ];

    private get slicesTotal(): number {
        return this.slices.reduce((acc, slice) => acc + slice[0] + slice[1], 0);
    }
}
