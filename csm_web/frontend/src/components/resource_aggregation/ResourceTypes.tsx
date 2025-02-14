import { DateTime } from "luxon";
import { DEFAULT_TIMEZONE } from "../../utils/datetime";

export interface Resource {
  id?: number;
  weekNum: number;
  date: string;
  topics: string;
  worksheets: Worksheet[];
  links: Link[];
}

export interface Worksheet {
  id: number;
  resource: number;
  name: string;
  worksheetFile: string | File;
  solutionFile: string | File;
  // there are three states for a schedule:
  // - fully specified string in ISO format
  // - empty string, i.e. schedule is enabled, but the user hasn't input anything yet
  // - null, i.e. no schedule is set
  worksheetSchedule: string | null;
  solutionSchedule: string | null;
  // subset of ['worksheet', 'worksheetFile', 'solutionFile'],
  // indicating what part of the worksheet is marked for deletion.
  deleted?: string[];
}

// There's no easy way of type hinting the keys of an interfaace,
// and passing around plain strings is error-prone;
// this enum helps ensure that keys are valid when editing/accessing worksheet objects.
export enum WorksheetKeys {
  id = "id",
  resource = "resource",
  name = "name",
  worksheetFile = "worksheetFile",
  worksheetSchedule = "worksheetSchedule",
  solutionFile = "solutionFile",
  solutionSchedule = "solutionSchedule",
  deleted = "deleted"
}

export interface Link {
  id: number;
  resource: number;
  name: string;
  url: string;
  deleted: boolean;
}

export interface FormErrors {
  weekNum: string;
  date: string;
  topics: string;
  existingWorksheets: Map<number, string>;
  newWorksheets: Map<number, string>;
  existingLinks: Map<number, string>;
  newLinks: Map<number, string>;
}

export interface Touched {
  weekNum: boolean;
  date: boolean;
  topics: boolean;
  // set of ids/indices of touched worksheets
  existingWorksheets: Set<number>;
  newWorksheets: Set<number>;
  existingLinks: Set<number>;
  newLinks: Set<number>;
}

/**
 * Creates an empty Resource object.
 *
 * @returns empty Resource object
 */
export function emptyResource(): Resource {
  return {
    weekNum: "" as unknown as number, // to trick typescript in accepting an empty string
    date: "",
    topics: "",
    worksheets: [],
    links: []
  };
}

/**
 * Creates an empty Worksheet object.
 *
 * @returns empty Worksheet object
 */
export function emptyWorksheet(): Worksheet {
  return {
    id: null as unknown as number,
    resource: null as unknown as number,
    name: "",
    worksheetFile: "",
    worksheetSchedule: null,
    solutionFile: "",
    solutionSchedule: null
  };
}

export function emptyLink(): Link {
  return {
    id: null as unknown as number,
    resource: null as unknown as number,
    name: "",
    url: "",
    deleted: false
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
    worksheetSchedule: worksheet.worksheetSchedule,
    solutionFile: worksheet.solutionFile,
    solutionSchedule: worksheet.solutionSchedule
  };
}
/**
 * Creates a shallow copy of a link object.
 *
 * @param link link object to copy from
 * @returns copy of specified link object
 */
export function copyLink(link: Link): Link {
  return {
    id: link.id,
    resource: link.resource,
    name: link.name,
    url: link.url,
    deleted: false
  };
}

/**
 * Normalizes the worksheet data to prepare for serialization.
 * Assumes that the data has been validated.
 *
 * In particular, updates the following:
 * - `worksheetSchedule` and `solutionSchedule` to be of correct ISO format;
 *   in particular, according to the JS specification, the time strings given
 *   will never have a timezone specified; we set the default timezone (PST) here.
 */
export function normalizeWorksheet(worksheet: Worksheet): Worksheet {
  let updatedWorksheetSchedule = worksheet.worksheetSchedule;
  if (worksheet.worksheetSchedule != null) {
    updatedWorksheetSchedule = DateTime.fromISO(worksheet.worksheetSchedule, {
      zone: DEFAULT_TIMEZONE
    }).toISO();
  }

  let updatedSolutionSchedule = worksheet.solutionSchedule;
  if (worksheet.solutionSchedule != null) {
    updatedSolutionSchedule = DateTime.fromISO(worksheet.solutionSchedule, {
      zone: DEFAULT_TIMEZONE
    }).toISO();
  }

  return { ...worksheet, worksheetSchedule: updatedWorksheetSchedule, solutionSchedule: updatedSolutionSchedule };
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
    newWorksheets: new Map(),
    existingLinks: new Map(),
    newLinks: new Map()
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
    newWorksheets: new Set(),
    existingLinks: new Set(),
    newLinks: new Set()
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
    newWorksheets: new Set(),
    existingLinks: new Set(),
    newLinks: new Set()
  };
}
