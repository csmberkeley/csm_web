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
  worksheetFile: string | File;
  solutionFile: string | File;
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
  onSubmit: Function;
  onCancel: Function;
}

export function emptyResource(): Resource {
  return {
    weekNum: 0,
    date: "",
    topics: "",
    worksheets: []
  };
}

export function emptyWorksheet(): Worksheet {
  return {
    id: null,
    resource: null,
    name: "",
    worksheetFile: "",
    solutionFile: ""
  };
}
