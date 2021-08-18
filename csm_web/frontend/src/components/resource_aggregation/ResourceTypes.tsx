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
  deleted?: string[];
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

/**
 * Creates an empty Resource object.
 *
 * @returns empty Resource object
 */
export function emptyResource(): Resource {
  return {
    weekNum: 0,
    date: "",
    topics: "",
    worksheets: []
  };
}

/**
 * Creates an empty Worksheet object.
 *
 * @returns empty Worksheet object
 */
export function emptyWorksheet(): Worksheet {
  return {
    id: null,
    resource: null,
    name: "",
    worksheetFile: "",
    solutionFile: ""
  };
}

/**
 * Creates a shallow copy of a worksheet object.
 *
 * @param worksheet worksheet object to copy from
 * @returns copy of specified worksheet object
 */
export function copyWorksheet(worksheet: Worksheet): Worksheet {
  return {
    id: worksheet.id,
    resource: worksheet.resource,
    name: worksheet.name,
    worksheetFile: worksheet.worksheetFile,
    solutionFile: worksheet.solutionFile
  };
}
