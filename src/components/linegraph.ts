// Input data structure for the line graph component.
type Dataset = {
  label: string;
  data: number[];
  color: string;
};

export type GraphData = {
  title?: string;
  labels: Iterable<string>;
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
      this.box.x + i * this.xScale,
      this.box.y + this.box.height - (y - this.minYAxisValue) * this.yScale
    ]);
    return { label: dataset.label, data: scaledData, color: dataset.color };
  }
}

// Data needed to render a line graph.
export class Graph { 
  // Max and min values in the datasets.
  readonly maxYValue: number;
  readonly minYValue: number;

  // Max and min values for the Y axis of the graph.
  readonly maxYAxisValue: number;
  readonly minYAxisValue: number;

  // Max and min values for both datasets and the graph.
  readonly xAxisLabels: string[]
  readonly maxXValue: string;
  readonly minXValue: string;

  // Lists of (x, y) pairs for each dataset in pixel coordinates.
  readonly scaledDatasets: readonly ScaledDataset[];

  // SVG path for the graph.
  readonly svgPaths: readonly string[];

  constructor(readonly data: GraphData, box: GraphBox) {
    this.maxYValue = Math.max(...this.data.datasets.flatMap(ds => ds.data));
    this.minYValue = Math.min(...this.data.datasets.flatMap(ds => ds.data));

    this.maxYAxisValue = Math.max(1000, Math.ceil(this.maxYValue / 1000) * 1000);
    this.minYAxisValue = 0;

    this.xAxisLabels = Array.from(this.data.labels);
    this.maxXValue = this.xAxisLabels[this.xAxisLabels.length - 1];
    this.minXValue = this.xAxisLabels[0];

    const coordinateTransform = new InputToPixelCoordateTransform(
      box, this.xAxisLabels, this.minYAxisValue, this.maxYAxisValue);

    this.scaledDatasets = this.data.datasets.map(dataset => {
      return coordinateTransform.apply(dataset);
    });

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