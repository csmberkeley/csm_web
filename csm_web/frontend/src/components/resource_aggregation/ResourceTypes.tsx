import { Roles } from "../../utils/user";

export interface Resource {
  id?: number;
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

export interface ResourceTableProps {
  courseID: number;
  roles: Roles;
  getResources: () => Promise<Array<Resource>>;
  updateResources: () => Promise<Array<Resource>>;
}

export interface FormErrors {
  weekNum: string;
  date: string;
  topics: string;
  existingWorksheets: Map<number, string>;
  newWorksheets: Map<number, string>;
}

export interface Touched {
  weekNum: boolean;
  date: boolean;
  topics: boolean;
  // set of ids/indices of touched worksheets
  existingWorksheets: Set<number>;
  newWorksheets: Set<number>;
}

/**
 * Creates an empty Resource object.
 *
 * @returns empty Resource object
 */
export function emptyResource(): Resource {
  return {
    weekNum: ("" as unknown) as number, // to trick typescript in accepting an empty string
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
    id: (null as unknown) as number,
    resource: (null as unknown) as number,
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

/**
 * Creates an empty FormErrors object
 *
 * @returns empty FormErrors object
 */
export function emptyFormErrors(): FormErrors {
  return {
    weekNum: "",
    date: "",
    topics: "",
    // mapping of worksheet id/index to error string
    existingWorksheets: new Map(),
    newWorksheets: new Map()
  };
}

/**
 * Creates an empty Touched object
 *
 * @returns empty Touched object
 */
export function emptyTouched(): Touched {
  return {
    weekNum: false,
    date: false,
    topics: false,
    // set of ids/indices of touched worksheets
    existingWorksheets: new Set(),
    newWorksheets: new Set()
  };
}

/**
 * Creates a complete Touched object
 *
 * @returns complete Touched object
 */
export function allTouched(): Touched {
  return {
    weekNum: true,
    date: true,
    topics: true,
    // set of ids/indices of touched worksheets
    existingWorksheets: new Set(),
    newWorksheets: new Set()
  };
}
