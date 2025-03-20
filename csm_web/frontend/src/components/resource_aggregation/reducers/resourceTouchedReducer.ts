import { ResourceValidationField } from "../ResourceTypes";

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

export enum ResourceTouchedActionType {
  SetTouched,
  DeleteTouched
}

type ResourceTouchedReducerAction =
  | {
      type: ResourceTouchedActionType.SetTouched;
      field: ResourceValidationField.weekNum | ResourceValidationField.date | ResourceValidationField.topics;
    }
  | {
      type: ResourceTouchedActionType.SetTouched;
      field:
        | ResourceValidationField.newWorksheets
        | ResourceValidationField.newLinks
        | ResourceValidationField.existingWorksheets
        | ResourceValidationField.existingLinks;
      id: number;
    }
  | {
      type: ResourceTouchedActionType.DeleteTouched;
      field: ResourceValidationField.newWorksheets | ResourceValidationField.newLinks;
      id: number;
      /**
       * Whether the resource was deleted as well: this triggers a shift in the indices.
       */
      deletedResource?: boolean;
    }
  | {
      type: ResourceTouchedActionType.DeleteTouched;
      field: ResourceValidationField.existingWorksheets | ResourceValidationField.existingLinks;
      id: number;
    };

interface ResourceTouchedReducerState {
  touched: Touched;
}

/**
 * Reducer to manage touched input fields.
 */
export function resourceTouchedReducer(
  { touched }: ResourceTouchedReducerState,
  action: ResourceTouchedReducerAction
): ResourceTouchedReducerState {
  switch (action.type) {
    case ResourceTouchedActionType.SetTouched: {
      switch (action.field) {
        // boolean fields
        case ResourceValidationField.weekNum:
        case ResourceValidationField.date:
        case ResourceValidationField.topics: {
          touched[action.field] = true;
          return { touched: { ...touched } };
        }

        // set fields
        case ResourceValidationField.newWorksheets:
        case ResourceValidationField.newLinks:
        case ResourceValidationField.existingWorksheets:
        case ResourceValidationField.existingLinks: {
          const updatedSet = new Set(touched[action.field]);
          updatedSet.add(action.id);
          return { touched: { ...touched, [action.field]: updatedSet } };
        }
      }

      // unreachable due to enum cases above,
      // but the break is still included here to be safe.
      break;
    }

    case ResourceTouchedActionType.DeleteTouched: {
      switch (action.field) {
        // special handling for new worksheets/links, since they are identified by index;
        // deleting an item will shift all others after it by 1
        case ResourceValidationField.newWorksheets:
        case ResourceValidationField.newLinks: {
          let updatedSet = new Set();

          if (action.deletedResource) {
            for (const index of touched[action.field]) {
              if (index < action.id) {
                updatedSet.add(index);
              } else if (index > action.id) {
                updatedSet.add(index - 1);
              }
              // deos not re-add item equal to `index`, since it has been deleted
            }
          } else {
            updatedSet = new Set(touched[action.field]);
            updatedSet.delete(action.id);
          }
          return { touched: { ...touched, [action.field]: updatedSet } };
        }

        case ResourceValidationField.existingWorksheets:
        case ResourceValidationField.existingLinks: {
          const updatedSet = new Set(touched[action.field]);
          updatedSet.delete(action.id);
          return { touched: { ...touched, [action.field]: updatedSet } };
        }
      }
    }
  }
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
