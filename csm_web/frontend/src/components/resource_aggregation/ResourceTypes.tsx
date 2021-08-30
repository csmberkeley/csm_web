import { ChangeEvent, MouseEvent } from "react";
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

export interface ResourceRowProps {
  initialResource: Resource;
  onUpdateResource: (
    newResource: Resource,
    fileFormDataMap: Map<number, Worksheet>,
    newWorksheets: Array<Worksheet>
  ) => void;
  canEdit: boolean;
  onDeleteResource: (resourceId: number) => void;
  addingResource: boolean;
  cancelOverride: () => void;
}

export interface ResourceRowRenderProps {
  resource: Resource;
  canEdit: boolean;
  onSetEdit: () => void;
  onDelete: (resourceId: number) => void;
}

export interface ResourceFileFieldProps {
  worksheet: Worksheet;
  fileType: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (e: MouseEvent<HTMLButtonElement>) => void;
}

export interface ResourceWorksheetEditProps {
  worksheet: Worksheet;
  onChange: (e: ChangeEvent<HTMLInputElement>, worksheetId: number, field: string, getFile?: boolean) => void;
  onDelete: (worksheetId: number) => void;
  onDeleteFile: (worksheetId: number, field: string) => void;
  onBlur: () => void;
  formErrorsMap: Map<number, string>;
  index: number;
}

export interface ResourceEditProps {
  resource: Resource;
  onChange: (e: ChangeEvent<HTMLInputElement>, field: string) => void;
  onSubmit: (
    e: MouseEvent<HTMLButtonElement>,
    fileFormDataMap: Map<number, Worksheet>,
    newWorksheets: Array<Worksheet>
  ) => void;
  onCancel: () => void;
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
