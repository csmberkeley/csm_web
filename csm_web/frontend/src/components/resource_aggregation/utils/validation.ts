import { DateTime } from "luxon";
import { Dispatch } from "react";

import { parseDatetimeInput } from "../../../utils/datetime";
import {
  checkWorksheetFile,
  Link,
  LinkKeys,
  Resource,
  ResourceValidationField,
  Worksheet,
  WorksheetKeys
} from "../ResourceTypes";
import { ResourceFormErrorActionType, ResourceFormErrorReducerAction } from "../reducers/resourceFormErrorReducer";
import { Touched } from "../reducers/resourceTouchedReducer";

/**
 * Parameters for resource validation.
 *
 * All values are read-only, enforced through types.
 */
interface ValidateParams {
  resource: Readonly<Resource>;
  newWorksheets: ReadonlyArray<Readonly<Worksheet>>;
  existingWorksheets: ReadonlyMap<number, Worksheet>;
  newLinks: ReadonlyArray<Readonly<Link>>;
  existingLinks: ReadonlyMap<number, Link>;
  touched: Readonly<Touched>;
  formErrorDispatch: Dispatch<ResourceFormErrorReducerAction>;
  validateAll?: boolean;
}

/**
 * Validates form inputs, updating error strings and returning whether or not the fields are valid
 *
 * The `validateAll` parameter is needed because of the asynchronous state updates.
 *
 * @param validateAll - whether all fields should be validated
 *
 * @returns whether any errors are present
 */
export function validateResources({
  resource,
  newWorksheets,
  existingWorksheets,
  newLinks,
  existingLinks,
  touched,
  formErrorDispatch,
  validateAll = false
}: Readonly<ValidateParams>) {
  const { weekNum, date, topics } = resource;

  // keep track of whether there are any errors present;
  // to be used as the return value, since the state will not be updated in this function.
  let anyErrorsPresent = false;

  if (validateAll || touched.weekNum) {
    let errorText = "";
    if (!weekNum) {
      errorText = "Week number is required";
    } else if (isNaN(weekNum)) {
      errorText = "Week number must be a number";
    } else if (weekNum < 0) {
      errorText = "Week number must be larger than 0";
    }

    // set flag if error text is present
    anyErrorsPresent ||= !!errorText;

    formErrorDispatch({
      type: errorText ? ResourceFormErrorActionType.SetError : ResourceFormErrorActionType.DeleteError,
      field: ResourceValidationField.weekNum,
      text: errorText
    });
  }
  if (validateAll || touched.date) {
    let errorText = "";
    if (!date) {
      errorText = "Date is required";
    }

    anyErrorsPresent ||= !!errorText;

    formErrorDispatch({
      type: errorText ? ResourceFormErrorActionType.SetError : ResourceFormErrorActionType.DeleteError,
      field: ResourceValidationField.date,
      text: errorText
    });
  }
  if (validateAll || touched.topics) {
    let errorText = "";
    if (!topics) {
      errorText = "Topics is required";
    }

    anyErrorsPresent ||= !!errorText;

    formErrorDispatch({
      type: errorText ? ResourceFormErrorActionType.SetError : ResourceFormErrorActionType.DeleteError,
      field: ResourceValidationField.topics,
      text: errorText
    });
  }

  // collate all worksheets that should be validated
  const worksheetsForValidation = [
    ...newWorksheets
      .map(
        (worksheet, index) =>
          ({
            field: ResourceValidationField.newWorksheets,
            id: index,
            worksheet
          }) as const
      )
      // skip worksheets that have not been touched yet
      .filter(({ id }) => validateAll || touched.newWorksheets.has(id)),
    ...Array(...existingWorksheets.entries())
      .map(
        ([worksheetId, worksheet]) =>
          ({
            field: ResourceValidationField.existingWorksheets,
            id: worksheetId,
            worksheet
          }) as const
      )
      // skip worksheets that have not been touched yet
      .filter(({ id }) => validateAll || touched.existingWorksheets.has(id))
  ];

  // handle worksheet validation
  for (const { field, id, worksheet } of worksheetsForValidation) {
    const curErrors = new Map<
      | WorksheetKeys.name
      | WorksheetKeys.worksheetFile
      | WorksheetKeys.solutionFile
      | WorksheetKeys.worksheetSchedule
      | WorksheetKeys.solutionSchedule,
      string
    >([
      [WorksheetKeys.name, ""],
      [WorksheetKeys.worksheetFile, ""],
      [WorksheetKeys.solutionFile, ""],
      [WorksheetKeys.worksheetSchedule, ""],
      [WorksheetKeys.solutionSchedule, ""]
    ]);

    if (!worksheet.name) {
      curErrors.set(WorksheetKeys.name, "Worksheet name is required");
    }

    const hasWorksheetFile = checkWorksheetFile(worksheet, WorksheetKeys.worksheetFile);
    const hasSolutionFile = checkWorksheetFile(worksheet, WorksheetKeys.solutionFile);
    if (hasSolutionFile && !hasWorksheetFile) {
      // solution file cannot be specified if no worksheet has been specified
      curErrors.set(
        WorksheetKeys.solutionFile,
        "Solution file cannot be specified without a corresponding worksheet file"
      );
    }

    // validate schedules
    for (const [scheduleKey, fileKey] of [
      [WorksheetKeys.worksheetSchedule, WorksheetKeys.worksheetFile],
      [WorksheetKeys.solutionSchedule, WorksheetKeys.solutionFile]
    ] as const) {
      const scheduleStr = worksheet[scheduleKey];
      if (scheduleStr !== null) {
        // schedule was specified

        // worksheet file must also be specified
        if (!checkWorksheetFile(worksheet, fileKey)) {
          // no worksheet, or it has been deleted; can't specify schedule in this case
          curErrors.set(scheduleKey, "Schedule date cannot be specified without a file");
        } else {
          // validate the date
          if (scheduleStr === "") {
            curErrors.set(scheduleKey, "Schedule date must be specified or disabled");
          } else {
            // check to see if it's a valid datetime in the future.
            const scheduleDate = parseDatetimeInput(scheduleStr);
            if (!scheduleDate.isValid) {
              curErrors.set(scheduleKey, "Schedule date is invalid");
            } else if (scheduleDate < DateTime.now()) {
              curErrors.set(scheduleKey, "Schedule date must be in the future");
            }
          }
        }
      }
    }

    // dispatch errors
    curErrors.forEach((errorText, errorKey) => {
      anyErrorsPresent ||= !!errorText;

      if (errorText) {
        formErrorDispatch({
          type: ResourceFormErrorActionType.SetError,
          field,
          id,
          key: errorKey,
          text: errorText
        });
      } else {
        formErrorDispatch({
          type: ResourceFormErrorActionType.DeleteError,
          field,
          id,
          key: errorKey
        });
      }
    });
  }

  /**
   * Validates a given link.
   *
   * @returns 0 if not valid, 1 if valid, 2 if valid when https:// appended
   */
  const isValidURL = (url: string) => {
    let urlTest;
    try {
      urlTest = new URL(url);
    } catch {
      try {
        urlTest = new URL("https://" + url);
        return urlTest.protocol === "http:" || urlTest.protocol === "https:" ? 2 : 0;
      } catch {
        return 0;
      }
    }
    return urlTest.protocol === "http:" || urlTest.protocol === "https:" ? 1 : 0;
  };

  // collate all links that should be validated
  const linksForValidation = [
    ...newLinks
      .map(
        (link, index) =>
          ({
            field: ResourceValidationField.newLinks,
            id: index,
            link: link
          }) as const
      )
      // skip worksheets that have not been touched yet
      .filter(({ id }) => validateAll || touched.newLinks.has(id)),
    ...Array(...existingLinks.entries())
      .map(
        ([linkId, link]) =>
          ({
            field: ResourceValidationField.existingLinks,
            id: linkId,
            link
          }) as const
      )
      // skip worksheets that have not been touched yet
      .filter(({ id }) => validateAll || touched.existingLinks.has(id))
  ];

  // handle link validation
  for (const { field, id, link } of linksForValidation) {
    const curErrors = new Map<LinkKeys.name | LinkKeys.url, string>([
      [LinkKeys.name, ""],
      [LinkKeys.url, ""]
    ]);

    // validate name
    if (!link.name) {
      curErrors.set(LinkKeys.name, "Link name is required");
    }

    // validate url
    if (!link.url) {
      curErrors.set(LinkKeys.url, "Link URL is required");
    } else if (!isValidURL(link.url)) {
      curErrors.set(LinkKeys.url, "Link URL is invalid");
    }

    // dispatch errors
    curErrors.forEach((errorText, errorKey) => {
      anyErrorsPresent ||= !!errorText;

      if (errorText) {
        formErrorDispatch({
          type: ResourceFormErrorActionType.SetError,
          field,
          id,
          key: errorKey,
          text: errorText
        });
      } else {
        formErrorDispatch({
          type: ResourceFormErrorActionType.DeleteError,
          field,
          id,
          key: errorKey
        });
      }
    });
  }

  // valid if and only if no errors are present
  return !anyErrorsPresent;
}
