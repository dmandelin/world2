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
    return [0, Math.max(1000, Math.ceil(max / 1000) * 1000)];
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
  title?: string;
  labels: Iterable<string>;
  yAxisScaler?: YAxisScaler;
  datasets: Dataset[];
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

export class InputToPixelCoordateTransform {
  readonly xScale: number;
  readonly yScale: number;

  constructor(
    readonly box: GraphBox,
    xAxisLabels: string[],
    readonly minYAxisValue: number,
    readonly maxYAxisValue: number,
  ) {
    this.xScale = box.width / (xAxisLabels.length - 1);
    this.yScale = box.height / (maxYAxisValue - minYAxisValue);
  }

  apply(dataset: Dataset): ScaledDataset {
    const scaledData: [number, number][] = dataset.data.map((y, i) => [
      this.applyToX(i),
      y !== undefined ? this.applyToY(y) : NaN,
    ]);
    return { label: dataset.label, data: scaledData, color: dataset.color };
  }

  applyToX(x: number): number {
    return this.box.x + x * this.xScale;
  }

  applyToY(y: number): number {
    return this.box.y + this.box.height - (y - this.minYAxisValue) * this.yScale;
  }

  unapplyToPoint(xPixel: number, yPixel: number): [number, number] {
    const x = Math.round((xPixel - this.box.x) / this.xScale);
    const y = Math.round(this.maxYAxisValue - (yPixel - this.box.y) / this.yScale);
    return [x, y];
  }
}

// Data needed to render a line graph.
export class Graph { 
  // Max and min values for the Y axis of the graph.
  readonly maxYAxisValue: number;
  readonly minYAxisValue: number;
  // (label, pixel coordinate)
  readonly yAxisTicks: [string, number][];

  // Max and min values for both datasets and the graph.
  readonly xAxisLabels: string[]
  readonly maxXValue: string;
  readonly minXValue: string;

  readonly coordinateTransform: InputToPixelCoordateTransform;

  // Lists of (x, y) pairs for each dataset in pixel coordinates.
  readonly scaledDatasets: readonly ScaledDataset[];

  // SVG path for the graph.
  readonly svgPaths: readonly string[];

  constructor(readonly data: GraphData, box: GraphBox) {
    // Compute min and max graph area in input coordinates.
    this.xAxisLabels = Array.from(this.data.labels);
    this.maxXValue = this.xAxisLabels[this.xAxisLabels.length - 1];
    this.minXValue = this.xAxisLabels[0];

    const scaler = data.yAxisScaler || new DefaultScaler();
    [this.minYAxisValue, this.maxYAxisValue] = scaler.endpoints(this.data.datasets);

    // Create the coordinate transform.
    this.coordinateTransform = new InputToPixelCoordateTransform(
      box, this.xAxisLabels, this.minYAxisValue, this.maxYAxisValue);

    // Build values that rely on the coordinate transform.
    this.yAxisTicks = scaler.ticks(this.data.datasets).map(value => {
      const y = this.coordinateTransform.applyToY(value);
      return [value.toFixed(), y];
    });
    this.scaledDatasets = this.data.datasets.map(dataset => {
      return this.coordinateTransform.apply(dataset);
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

  get title(): string { return this.data.title || ''; }

  inputToPixelCoordinates(xInput: number, yInput: number): [number, number] {
    const xPixel = this.coordinateTransform.applyToX(xInput);
    const yPixel = this.coordinateTransform.applyToY(yInput);
    return [xPixel, yPixel];
  }

  pixelToInputCoordinates(xPixel: number, yPixel: number): [number, number] {
    return this.coordinateTransform.unapplyToPoint(xPixel, yPixel);
  }
}
