// Input data structure for the line graph component.
type Dataset = {
  label: string;
  data: (number | undefined)[];
  color: string;
};

abstract class YAxisScaler {
  abstract endpoints(datasets: Dataset[]): [number, number];

  range(datasets: Dataset[]): [number, number] {
    const min = Math.min(...datasets.flatMap(ds => ds.data.filter((d): d is number => d !== undefined)));
    const max = Math.max(...datasets.flatMap(ds => ds.data.filter((d): d is number => d !== undefined)));
    return [min, max];
  }

  ticks(datasets: Dataset[]): number[] {
    return [];
  }
}

export class DefaultScaler extends YAxisScaler {
  endpoints(datasets: Dataset[]): [number, number] {
    return this.range(datasets);
  }
}

export class PopulationScaler extends YAxisScaler {
  endpoints(datasets: Dataset[]): [number, number] {
    const [min, max] = this.range(datasets);
    const baseMax = Math.pow(10, Math.ceil(Math.log10(max)));
    let adjMax = baseMax;
    if (baseMax < 1) {
      adjMax = 1;
    } else if (max * 1.2 < baseMax / 5) {
      adjMax = baseMax / 5;
    } else if (max * 1.2 < baseMax / 2) {
      adjMax = baseMax / 2;
    }
    return [0, adjMax];
  }
}

export class ZeroCenteredScaler extends YAxisScaler {
  endpoints(datasets: Dataset[]): [number, number] {
    return [-100, 100];
  }

  ticks(datasets: Dataset[]): number[] {
    return [0];
  }
}

export type GraphData = {
  // Title of the graph.
  title?: string;

  // Whether to show the legend.
  showLegend?: boolean;

  // X axis labels.
  labels: Iterable<string>;

  // Y axis scaler to determine the min and max Y values.
  yAxisScaler?: YAxisScaler;

  // Datasets to be plotted on the graph.
  datasets: Dataset[];

  // Optional second Y axis for additional datasets.
  secondYAxis?: {
    datasets: Dataset[],
    scaler?: YAxisScaler,
  };
};

type ScaledDataset = {
  label: string,
  data: [number, number][],
  color: string,
};

export class GraphBox {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly width: number,
    readonly height: number,
  ) {}
}

class InputToPixelXValueTransform {
  readonly xScale: number;

  constructor(
    readonly box: GraphBox,
    readonly xAxisLabels: string[],
  ) {
    this.xScale = box.width / (xAxisLabels.length - 1);
  }

  i2p(x: number): number {
    return this.box.x + x * this.xScale;
  }

  p2i(xPixel: number): number {
    return Math.round((xPixel - this.box.x) / this.xScale);
  }
}

class InputToPixelYValueTransform {
  readonly yScale: number;

  constructor(
    readonly box: GraphBox,
    readonly minYAxisValue: number,
    readonly maxYAxisValue: number,
  ) {
    this.yScale = box.height / (maxYAxisValue - minYAxisValue);
  }

  i2p(y: number): number {
    return this.box.y + this.box.height - (y - this.minYAxisValue) * this.yScale;
  }

  p2i(yPixel: number): number {
    return Math.round(this.maxYAxisValue - (yPixel - this.box.y) / this.yScale);
  }
}

// Part of the graph corresponding to a single side (e.g., left or right).
export class GraphSide { 
  // Max and min values for the Y axis of the graph.
  readonly maxYAxisValue: number;
  readonly minYAxisValue: number;
  // (label, pixel coordinate)
  readonly yAxisTicks: [string, number][];

  readonly ytransform: InputToPixelYValueTransform;

  // Lists of (x, y) pairs for each dataset in pixel coordinates.
  readonly scaledDatasets: readonly ScaledDataset[];

  // SVG path for the graph.
  readonly svgPaths: readonly string[];

  constructor(
      readonly datasets: Dataset[], 
      xtransform: InputToPixelXValueTransform, 
      scaler: YAxisScaler, 
      box: GraphBox) {
    [this.minYAxisValue, this.maxYAxisValue] = scaler.endpoints(datasets);

    // Create the coordinate transform.
    this.ytransform = new InputToPixelYValueTransform(
      box, this.minYAxisValue, this.maxYAxisValue);

    // Build values that rely on the coordinate transform.
    this.yAxisTicks = scaler.ticks(datasets).map(value => {
      const y = this.ytransform.i2p(value);
      return [value.toFixed(), y];
    });
    this.scaledDatasets = datasets.map(dataset => {
      const data = dataset.data.map((y, i): [number, number] => {
        const x = xtransform.i2p(i);
        return [x, y === undefined ? NaN : this.ytransform.i2p(y)];
      });
      return {
        label: dataset.label,
        data: data,
        color: dataset.color,
      };
    });

    // Build the SVG paths for each dataset.
    this.svgPaths = this.scaledDatasets.map(dataset => {
        const pathData = dataset.data
          .filter(([_, y]) => !isNaN(y))
          .map(([x, y], i) => {
            if (i === 0) {
              return `M ${x} ${y}`;
            } else {
              return `L ${x} ${y}`;
            }
        }).join(' ');
      return `<path d="${pathData}" stroke="${dataset.color}" fill="none" />`;
    });
  }
}


// Data needed to render a line graph.
export class Graph { 
  // Max and min values for both datasets and the graph.
  readonly xAxisLabels: string[]
  readonly maxXValue: string;
  readonly minXValue: string;

  readonly xtransform: InputToPixelXValueTransform;
  readonly sides: readonly GraphSide[];

  constructor(readonly data: GraphData, box: GraphBox) {
    // Compute min and max graph area in input coordinates.
    this.xAxisLabels = Array.from(this.data.labels);
    this.maxXValue = this.xAxisLabels[this.xAxisLabels.length - 1];
    this.minXValue = this.xAxisLabels[0];
    this.xtransform = new InputToPixelXValueTransform(box, this.xAxisLabels);

    const sides = [
      new GraphSide(
        this.data.datasets, 
        this.xtransform,
        this.data.yAxisScaler || new DefaultScaler(), 
        box),
    ];
    if (this.data.secondYAxis) {
      sides.push(new GraphSide(
        this.data.secondYAxis.datasets,
        this.xtransform,
        this.data.secondYAxis.scaler || new DefaultScaler(),
        box));
    }
    this.sides = sides;
  }

  get title(): string { return this.data.title || ''; }

  xp2i(xPixel: number): number {
    return this.xtransform.p2i(xPixel);
  }

  yp2i(yPixel: number, sideIndex = 0): number {
    return this.sides[sideIndex].ytransform.p2i(yPixel);
  }

  xi2p(x: number): number {
    return this.xtransform.i2p(x);
  }

  yi2p(y: number, sideIndex = 0): number {
    return this.sides[sideIndex].ytransform.i2p(y);
  }
}
