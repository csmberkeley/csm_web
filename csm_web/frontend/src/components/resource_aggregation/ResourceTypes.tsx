export interface Resource {
  weekNum: number;
  date: string;
  topics: string;
  worksheetName: string;
  worksheetFile: string;
  solutionFile: string;
}

export interface ResourceRowProps {
  initialResource: Resource;
  updateResource: Function;
  canEdit: boolean;
}

export interface ResourceEditProps {
  resource: Resource;
  handleChange: Function;
  handleFileChange: Function;
  handleSubmit: Function;
}
