export interface Resource {
  weekNum: number;
  date: string;
  topics: string;
  worksheets: Worksheet[];
}

export interface Worksheet {
  id: number;
  resource: number;
  name: string;
  worksheetFile: string;
  solutionFile: string;
}

export interface ResourceRowProps {
  initialResource: Resource;
  onUpdateResource: Function;
  canEdit: boolean;
  onDeleteResource: Function;
  addingResource: boolean;
  cancelOverride: Function;
}

export interface ResourceEditProps {
  resource: Resource;
  onChange: Function;
  onFileChange: Function;
  onSubmit: Function;
  onCancel: Function;
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