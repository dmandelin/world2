// Input data structure for the line graph component.
type Dataset = {
  label: string;
  data: number[];
  color: string;
};

abstract class YAxisScaler {
  abstract endpoints(datasets: Dataset[]): [number, number];

  range(datasets: Dataset[]): [number, number] {
    const min = Math.min(...datasets.flatMap(ds => ds.data));
    const max = Math.max(...datasets.flatMap(ds => ds.data));
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
      this.applyToY(y),
    ]);
    return { label: dataset.label, data: scaledData, color: dataset.color };
  }

  applyToX(x: number): number {
    return this.box.x + x * this.xScale;
  }

  applyToY(y: number): number {
    return this.box.y + this.box.height - (y - this.minYAxisValue) * this.yScale;
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
    const coordinateTransform = new InputToPixelCoordateTransform(
      box, this.xAxisLabels, this.minYAxisValue, this.maxYAxisValue);

    // Build values that rely on the coordinate transform.
    this.yAxisTicks = scaler.ticks(this.data.datasets).map(value => {
      const y = coordinateTransform.applyToY(value);
      return [value.toFixed(), y];
    });
    this.scaledDatasets = this.data.datasets.map(dataset => {
      return coordinateTransform.apply(dataset);
    });

    // Build the SVG paths for each dataset.
    this.svgPaths = this.scaledDatasets.map(dataset => {
      const pathData = dataset.data.map(([x, y], i) => {
        if (i === 0) {
          return `M ${x} ${y}`;
        } else {
          return `L ${x} ${y}`;
        }
      }).join(' ');
      console.log(pathData);
      return `<path d="${pathData}" stroke="${dataset.color}" fill="none" />`;
    });
  }

  get title(): string { return this.data.title || ''; }
}

/*
class Dataset {
  label: string;
  data: number[];
  color: string;

  readonly maxValue: number;
  readonly minValue: number;
  readonly xStep: number;
  readonly yScale: number;

  readonly svgPath: string;
  readonly svgYAxisLabels: string;

  constructor(label: string, data: number[], color: string) {
    this.label = label;
    this.data = data;
    this.color = color;

    this.maxValue = Math.max(...data);
    this.minValue = Math.min(...data);
    this.xStep = width / (data.length - 1);
    this.yScale = height / (this.maxValue - this.minValue);

    [this.svgPath, this.svgYAxisLabels] = getPath(this, 0);
  }
}

class Graph {
  data: GraphData;
  datasets: Dataset[];

  constructor(data: GraphData) {
    this.data = data;
    this.datasets = data.datasets.map(ds => new Dataset(ds.label, ds.data, ds.color));
  }
}
  */