import { emptyWorksheet, Worksheet, WorksheetKeys } from "../ResourceTypes";

export enum ResourceWorksheetActionType {
  UpdateField,
  DeleteWorksheet,
  DeleteFile,
  AddWorksheet
}

export enum ResourceWorksheetKind {
  EXISTING = "EXISTING_WORKSHEET",
  NEW = "NEW_WORKSHEET"
}

/**
 * Various possible actions that can be submitted to the reducer.
 * Each action can have different parameters, listed as part of the union type.
 *
 * `worksheetId` is either the existing worksheet ID, or the index of the new worksheet in the array.
 */
export type ResourceWorksheetReducerAction =
  | {
      type: ResourceWorksheetActionType.UpdateField;
      kind: ResourceWorksheetKind;
      worksheetId: number;
      field: WorksheetKeys.name;
      value: string;
    }
  | {
      type: ResourceWorksheetActionType.UpdateField;
      kind: ResourceWorksheetKind;
      worksheetId: number;
      field: WorksheetKeys.worksheetFile | WorksheetKeys.solutionFile;
      value: FileList;
    }
  | {
      type: ResourceWorksheetActionType.UpdateField;
      kind: ResourceWorksheetKind;
      worksheetId: number;
      field: WorksheetKeys.worksheetSchedule | WorksheetKeys.solutionSchedule;
      value: string | null;
    }
  | {
      type: ResourceWorksheetActionType.DeleteWorksheet;
      kind: ResourceWorksheetKind;
      worksheetId: number;
    }
  | {
      type: ResourceWorksheetActionType.DeleteFile;
      kind: ResourceWorksheetKind;
      worksheetId: number;
      field: WorksheetKeys.worksheetFile | WorksheetKeys.solutionFile;
    }
  | { type: ResourceWorksheetActionType.AddWorksheet };

interface ResourceWorksheetReducerState {
  existingWorksheets: Map<number, Worksheet>;
  newWorksheets: Worksheet[];
}

/**
 * Reducer to keep track of worksheets, and to handle all possible actions on the worksheets..
 */
export function resourceWorksheetReducer(
  { existingWorksheets, newWorksheets }: ResourceWorksheetReducerState,
  action: ResourceWorksheetReducerAction
): ResourceWorksheetReducerState {
  /**
   * Retrieves a worksheet, and calls the callback function on the worksheet.
   * The callback should modify the worksheet in-place.
   *
   * `worksheetKind` determines which variable the worksheet is taken from.
   * If existing, `worksheetId` is the ID of the worksheet to retrieve;
   * if new, `worksheetId` is the index in the array to retrieve.
   */
  const retrieveAndExecuteWorksheet = (
    worksheetKind: ResourceWorksheetKind,
    worksheetId: number,
    callback: (worksheet: Worksheet) => void
  ): ResourceWorksheetReducerState => {
    // retrieve the worksheet
    let worksheet: Worksheet;
    if (worksheetKind === ResourceWorksheetKind.EXISTING) {
      if (existingWorksheets.has(worksheetId)) {
        worksheet = existingWorksheets.get(worksheetId)!;
      } else {
        throw new Error(`Worksheet not found: id ${worksheetId}`);
      }
    } else {
      worksheet = newWorksheets[worksheetId];
    }

    // modify the worksheet
    callback(worksheet);

    // return updated worksheets
    if (worksheetKind === ResourceWorksheetKind.EXISTING) {
      return { existingWorksheets: new Map(existingWorksheets), newWorksheets };
    } else {
      return { existingWorksheets, newWorksheets: [...newWorksheets] };
    }
  };

  switch (action.type) {
    case ResourceWorksheetActionType.UpdateField: {
      switch (action.field) {
        // Update the worksheet name
        case WorksheetKeys.name: {
          return retrieveAndExecuteWorksheet(action.kind, action.worksheetId, worksheet => {
            worksheet[WorksheetKeys.name] = action.value;
          });
        }

        // Update the worksheet files
        case WorksheetKeys.worksheetFile:
        case WorksheetKeys.solutionFile: {
          return retrieveAndExecuteWorksheet(action.kind, action.worksheetId, worksheet => {
            worksheet[action.field] = action.value[0];
          });
        }

        // Update the worksheet schedules
        case WorksheetKeys.worksheetSchedule:
        case WorksheetKeys.solutionSchedule: {
          return retrieveAndExecuteWorksheet(action.kind, action.worksheetId, worksheet => {
            worksheet[action.field] = action.value;
          });
        }
      }

      // unreachable due to enum cases above,
      // but the break is still included here to be safe.
      break;
    }

    // Delete an existing worksheet
    case ResourceWorksheetActionType.DeleteWorksheet: {
      if (action.kind === ResourceWorksheetKind.EXISTING) {
        // special handling for marking a worksheet as deleted
        return retrieveAndExecuteWorksheet(action.kind, action.worksheetId, worksheet => {
          if (worksheet.deleted == undefined || !(worksheet.deleted instanceof Array)) {
            worksheet.deleted = [];
          }
          if (!worksheet.deleted.includes("worksheet")) {
            worksheet.deleted.push("worksheet");
          }
        });
      } else {
        // since new worksheets aren't registered in the database, we can just splice the worksheet from the array.
        const updatedWorksheets = [...newWorksheets];
        updatedWorksheets.splice(action.worksheetId, 1);
        return { existingWorksheets, newWorksheets: updatedWorksheets };
      }
    }

    // Delete an existing worksheet's file
    case ResourceWorksheetActionType.DeleteFile: {
      if (action.kind === ResourceWorksheetKind.EXISTING) {
        // special handling for marking a worksheet file as deleted
        return retrieveAndExecuteWorksheet(action.kind, action.worksheetId, worksheet => {
          if (worksheet.deleted == undefined || !(worksheet.deleted instanceof Array)) {
            worksheet.deleted = [];
          }
          if (!worksheet.deleted.includes(action.field)) {
            worksheet.deleted.push(action.field);
          }
        });
      } else {
        // since new worksheets aren't reigstered in the database, we can just delete the file from the object.
        const worksheet = newWorksheets[action.worksheetId];
        worksheet[action.field] = "";
        return { existingWorksheets, newWorksheets: [...newWorksheets] };
      }
    }

    case ResourceWorksheetActionType.AddWorksheet: {
      return { existingWorksheets, newWorksheets: [...newWorksheets, emptyWorksheet(newWorksheets)] };
    }
  }
}
