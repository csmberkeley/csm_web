import _ from "lodash";
import { ResourceValidationField, LinkKeys, WorksheetKeys } from "../ResourceTypes";

interface FormErrors {
  weekNum: string;
  date: string;
  topics: string;
  // map from id/index of workshset to form error
  existingWorksheets: Map<number, WorksheetError>;
  newWorksheets: Map<number, WorksheetError>;
  existingLinks: Map<number, LinkError>;
  newLinks: Map<number, LinkError>;
}

export interface LinkError {
  name: string;
  url: string;
}

const emptyLinkError = (): LinkError => ({ name: "", url: "" });

export interface WorksheetError {
  name: string;
  worksheetFile: string;
  solutionFile: string;
  worksheetSchedule: string;
  solutionSchedule: string;
}

const emptyWorksheetError = (): WorksheetError => ({
  name: "",
  worksheetFile: "",
  solutionFile: "",
  worksheetSchedule: "",
  solutionSchedule: ""
});

/**
 * Union type of all string fields in `FormErrors`
 */
type FormErrorFields_string =
  | ResourceValidationField.weekNum
  | ResourceValidationField.date
  | ResourceValidationField.topics;

/**
 * Union type of all worksheet fields in `FormErrors`
 */
type FormErrorFields_worksheet = ResourceValidationField.newWorksheets | ResourceValidationField.existingWorksheets;
/**
 * Union type of all link fields in `FormErrors`
 */
type FormErrorFields_link = ResourceValidationField.newLinks | ResourceValidationField.existingLinks;

interface ResourceFormErrorReducerState {
  formErrors: FormErrors;
}

export enum ResourceFormErrorActionType {
  SetError,
  DeleteError
}

export type ResourceFormErrorReducerAction =
  | {
      type: ResourceFormErrorActionType.SetError;
      field: FormErrorFields_string;
      text: string;
    }
  | {
      type: ResourceFormErrorActionType.SetError;
      field: FormErrorFields_worksheet;
      id: number;
      key:
        | WorksheetKeys.name
        | WorksheetKeys.worksheetFile
        | WorksheetKeys.solutionFile
        | WorksheetKeys.worksheetSchedule
        | WorksheetKeys.solutionSchedule;
      text: string;
    }
  | {
      type: ResourceFormErrorActionType.SetError;
      field: FormErrorFields_link;
      id: number;
      key: LinkKeys.name | LinkKeys.url;
      text: string;
    }
  | {
      type: ResourceFormErrorActionType.DeleteError;
      field: FormErrorFields_string;
    }
  | {
      type: ResourceFormErrorActionType.DeleteError;
      field: ResourceValidationField.newWorksheets;
      id: number;
      /**
       * Specific key to delete errors for;
       * can be omitted to delete all error text for the given worksheet.
       */
      key?:
        | WorksheetKeys.name
        | WorksheetKeys.worksheetFile
        | WorksheetKeys.solutionFile
        | WorksheetKeys.worksheetSchedule
        | WorksheetKeys.solutionSchedule;
      /**
       * Whether the resource was deleted as well: this triggers a shift in the indices
       * if no key is specified.
       */
      deletedResource?: boolean;
    }
  | {
      type: ResourceFormErrorActionType.DeleteError;
      field: ResourceValidationField.existingWorksheets;
      id: number;
      /**
       * Specific key to delete errors for;
       * can be omitted to delete all error text for the given worksheet.
       */
      key?:
        | WorksheetKeys.name
        | WorksheetKeys.worksheetFile
        | WorksheetKeys.solutionFile
        | WorksheetKeys.worksheetSchedule
        | WorksheetKeys.solutionSchedule;
    }
  | {
      type: ResourceFormErrorActionType.DeleteError;
      field: ResourceValidationField.newLinks;
      id: number;
      /**
       * Specific key to delete errors for;
       * can be omitted to delete all error text for the given link.
       */
      key?: LinkKeys.name | LinkKeys.url;
      /**
       * Whether the resource was deleted: this triggers a shift in the indices
       * if no key is specified.
       */
      deletedResource?: boolean;
    }
  | {
      type: ResourceFormErrorActionType.DeleteError;
      field: ResourceValidationField.existingLinks;
      id: number;
      /**
       * Specific key to delete errors for;
       * can be omitted to delete all error text for the given link.
       */
      key?: LinkKeys.name | LinkKeys.url;
    };

/**
 * Reducer to manage form errors.
 */
export function resourceFormErrorReducer(
  { formErrors }: ResourceFormErrorReducerState,
  action: ResourceFormErrorReducerAction
): ResourceFormErrorReducerState {
  switch (action.type) {
    case ResourceFormErrorActionType.SetError: {
      switch (action.field) {
        case ResourceValidationField.weekNum:
        case ResourceValidationField.date:
        case ResourceValidationField.topics: {
          formErrors[action.field] = action.text;
          return { formErrors: { ...formErrors } };
        }

        case ResourceValidationField.newWorksheets:
        case ResourceValidationField.existingWorksheets: {
          const updatedErrors = new Map(formErrors[action.field]);
          if (updatedErrors.has(action.id)) {
            // overwrite existing error object
            const curError = updatedErrors.get(action.id)!;
            curError[action.key] = action.text;
          } else {
            // add new worksheet error object
            updatedErrors.set(action.id, { ...emptyWorksheetError(), [action.key]: action.text });
          }
          return { formErrors: { ...formErrors, [action.field]: updatedErrors } };
        }

        case ResourceValidationField.newLinks:
        case ResourceValidationField.existingLinks: {
          const updatedErrors = new Map(formErrors[action.field]);
          if (updatedErrors.has(action.id)) {
            // overwrite existing error object
            const curError = updatedErrors.get(action.id)!;
            curError[action.key] = action.text;
          } else {
            // add new link error object
            updatedErrors.set(action.id, { ...emptyLinkError(), [action.key]: action.text });
          }
          return { formErrors: { ...formErrors, [action.field]: updatedErrors } };
        }
      }

      // unreachable due to enum cases above,
      // but the break is still included here to be safe.
      break;
    }

    case ResourceFormErrorActionType.DeleteError: {
      switch (action.field) {
        case ResourceValidationField.weekNum:
        case ResourceValidationField.date:
        case ResourceValidationField.topics: {
          formErrors[action.field] = "";
          return { formErrors: { ...formErrors } };
        }

        // Remove the error(s) for a new worksheet/link
        case ResourceValidationField.newWorksheets:
        case ResourceValidationField.newLinks: {
          // first, check if the deletion will actually shift the links
          let shiftLinks = false;
          if (action.deletedResource && !action.key) {
            // only shifts if the resource was deleted and a specific key was not given
            shiftLinks = true;
          }

          if (shiftLinks) {
            const updatedErrors = new Map();
            for (const [index, error] of formErrors[action.field]) {
              if (index < action.id) {
                updatedErrors.set(index, error);
              } else if (index > action.id) {
                updatedErrors.set(index - 1, error);
              }
              // deos not re-add item equal to `index`, since it has been deleted
            }

            return { formErrors: { ...formErrors, [action.field]: updatedErrors } };
          }

          // if no index shift occurs, we only need to look at the item with the given id;
          // using lodash to clone while maintaining the type
          const updatedErrors = _.clone(formErrors[action.field]);

          if (action.key && updatedErrors.has(action.id)) {
            const curErrors = updatedErrors.get(action.id)!;
            // type casting here to avoid linting errors:
            // the type of `action.key` is enforced through the action
            curErrors[action.key as keyof typeof curErrors] = "";
          } else {
            // if no key specified, then just remove all errors for the given id
            // (if the ID doesn't exist in the map, this does nothing)
            updatedErrors.delete(action.id);
          }

          return { formErrors: { ...formErrors, [action.field]: updatedErrors } };
        }

        // Remove the error(s) for an existing worksheet/link
        case ResourceValidationField.existingWorksheets:
        case ResourceValidationField.existingLinks: {
          const updatedErrors = _.clone(formErrors[action.field]);
          if (action.key && updatedErrors.has(action.id)) {
            const curErrors = updatedErrors.get(action.id)!;
            // type casting here to avoid linting errors:
            // the type of `action.key` is enforced through the action
            curErrors[action.key as keyof typeof curErrors] = "";
          } else {
            updatedErrors.delete(action.id);
          }

          return { formErrors: { ...formErrors, [action.field]: updatedErrors } };
        }
      }
    }
  }
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
 * Checks `formErrors` to see if there are any error messages
 *
 * @returns whether any errors are present
 */
export function hasAnyErrors(formErrors: FormErrors): boolean {
  // resource fields invalid
  if (formErrors.weekNum || formErrors.date || formErrors.topics) {
    return true;
  }
  // worksheet fields
  for (const errorObj of formErrors.newWorksheets.values()) {
    if (
      errorObj.name ||
      errorObj.worksheetFile ||
      errorObj.solutionFile ||
      errorObj.worksheetSchedule ||
      errorObj.solutionSchedule
    ) {
      return true;
    }
  }
  for (const errorObj of formErrors.existingWorksheets.values()) {
    if (
      errorObj.name ||
      errorObj.worksheetFile ||
      errorObj.solutionFile ||
      errorObj.worksheetSchedule ||
      errorObj.solutionSchedule
    ) {
      return true;
    }
  }
  for (const errorObj of formErrors.newLinks.values()) {
    if (errorObj.name || errorObj.url) return true;
  }
  for (const errorObj of formErrors.existingLinks.values()) {
    if (errorObj.name || errorObj.url) return true;
  }

  // no errors
  return false;
}
