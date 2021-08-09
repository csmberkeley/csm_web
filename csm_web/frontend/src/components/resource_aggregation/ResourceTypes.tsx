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
  deleteResource: Function;
  addingResource: boolean;
  cancelOverride: Function;
}

export interface ResourceEditProps {
  resource: Resource;
  handleChange: Function;
  handleFileChange: Function;
  handleSubmit: Function;
  handleCancel: Function;
}

export function emptyResource(): Resource {
  return {
    'weekNum': 0,
    'date': '',
    'topics': '',
    'worksheetName': '',
    'worksheetFile': '',
    'solutionFile': ''
  }
}