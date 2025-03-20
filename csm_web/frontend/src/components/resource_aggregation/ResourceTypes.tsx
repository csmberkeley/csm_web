import { parseDatetimeInput } from "../../utils/datetime";

export interface Resource {
  id?: number;
  weekNum: number;
  date: string;
  topics: string;
  worksheets: Worksheet[];
  links: Link[];
}

export enum ResourceKeys {
  id = "id",
  weekNum = "weekNum",
  date = "date",
  topics = "topics",
  worksheets = "worksheets",
  links = "links"
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

export enum LinkKeys {
  id = "id",
  resource = "resource",
  name = "name",
  url = "url",
  deleted = "deleted"
}

/**
 * Fields used in resource validation data structures.
 */
export enum ResourceValidationField {
  weekNum = "weekNum",
  date = "date",
  topics = "topics",
  existingWorksheets = "existingWorksheets",
  newWorksheets = "newWorksheets",
  existingLinks = "existingLinks",
  newLinks = "newLinks"
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
 * Other newly created worksheets should be passed as an argument,
 * so that the worksheet ID can be assigned uniquely.
 *
 * The new worksheet ID is computed as -max(abs(other IDs)) - 1;
 * this ensures that all new worksheet IDs are negative,
 * while still being different from other worksheet IDs.
 * If there are no other IDs, we start with -1.
 *
 * @returns empty Worksheet object
 */
export function emptyWorksheet(otherWorksheets: Worksheet[]): Worksheet {
  const maxAbsId = Math.max(0, ...otherWorksheets.map(worksheet => Math.abs(worksheet.id)));
  const nextWorksheetId = -maxAbsId - 1;
  return {
    id: nextWorksheetId,
    resource: null as unknown as number,
    name: "",
    worksheetFile: "",
    worksheetSchedule: null,
    solutionFile: "",
    solutionSchedule: null
  };
}

/**
 * Creates an empty Link object.
 *
 * Other newly created links should be passed as an argument,
 * so that the link ID can be assigned uniquely.
 *
 * The new link ID is computed as -max(abs(other IDs)) - 1;
 * this ensures that all new link IDs are negative,
 * while still being different from other link IDs.
 * If there are no other IDs, we start with -1.
 *
 * @returns empty Link object
 */
export function emptyLink(otherLinks: Link[]): Link {
  const maxAbsId = Math.max(0, ...otherLinks.map(link => Math.abs(link.id)));
  const nextLinkId = -maxAbsId - 1;
  return {
    id: nextLinkId,
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
 * - `id` is set to null if it is negative;
 *   this is because new worksheets have temporary negative IDs
 *   to distinguish them from each other.
 * - `worksheetSchedule` and `solutionSchedule` to be of correct ISO format;
 *   in particular, according to the JS specification, the time strings given
 *   will never have a timezone specified; we set the default timezone (PST) here.
 */
export function normalizeWorksheet(worksheet: Worksheet): Worksheet {
  let updatedWorksheetId = worksheet.id;
  if (updatedWorksheetId < 0) {
    updatedWorksheetId = null as unknown as number;
  }

  let updatedWorksheetSchedule = worksheet.worksheetSchedule;
  if (worksheet.worksheetSchedule != null) {
    updatedWorksheetSchedule = parseDatetimeInput(worksheet.worksheetSchedule).toISO();
  }

  let updatedSolutionSchedule = worksheet.solutionSchedule;
  if (worksheet.solutionSchedule != null) {
    updatedSolutionSchedule = parseDatetimeInput(worksheet.solutionSchedule).toISO();
  }

  return {
    ...worksheet,
    id: updatedWorksheetId,
    worksheetSchedule: updatedWorksheetSchedule,
    solutionSchedule: updatedSolutionSchedule
  };
}

/**
 * Convert a worksheet object into a key.
 */
export function worksheetToKey(worksheet: Worksheet): string {
  return `${worksheet.id}#${worksheet.name}#${worksheet.deleted?.toString()}#${worksheet.resource}`;
}

/**
 * Determines whether the given worksheet has an associated file of the given type.
 */
export function checkWorksheetFile(
  worksheet: Worksheet,
  fileType: WorksheetKeys.worksheetFile | WorksheetKeys.solutionFile
): boolean {
  const fileDeleted = worksheet.deleted && worksheet.deleted.includes(fileType);
  // file must be present and not deleted
  return !!worksheet[fileType] && !fileDeleted;
}
