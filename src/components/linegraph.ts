interface Dataset {
    label: string;
    data: number[];
    color: string;
  }

  interface LineGraphData {
    labels: string[];
    datasets: Dataset[];
  }