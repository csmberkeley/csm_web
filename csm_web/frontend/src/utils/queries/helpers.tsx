/**
 * Helper functions for query hooks.
 */

import { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

const MAX_RETRIES = 3;

/**
 * Derived class of Error for internal server errors.
 */
export class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}

/**
 * Derived class of Error for permissions-related errors.
 * This includes unauthorized access, forbidden access, and not found errors.
 */
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

/**
 * Helper function to check if a status code is a permissions error.
 * This is used to tell whether we should retry the request.
 *
 * @param status HTTP status code
 * @returns whether the status code is a client error
 */
export const handlePermissionsError = (status: number) => {
  if (status >= 400 && status < 500) {
    // client error (4xx)
    throw new PermissionError("You do not have permission to perform this action.");
  }
  // otherwise, fall through
};

/**
 * Handle errors from the backend API, if any occur.
 * If no error, nothing happens.
 */
export const handleError = (result: UseQueryResult<any, Error> | UseMutationResult<any, Error, any>): void => {
  if (result.isError) {
    if (result.error instanceof PermissionError) {
      // permissions error; do nothing, and let the component handle it
    } else {
      // otherwise, throw the error
      const failures = result.failureCount;
      throw new ServerError(`${result.error.message} (${failures} failures)`);
    }
  }
};

/**
 * Helper function to determine whether a query should be retried.
 */
export const handleRetry = (failureCount: number, error: Error) => {
  if (failureCount > MAX_RETRIES) {
    return false;
  } else if (error instanceof ServerError) {
    return true;
  } else if (error instanceof PermissionError) {
    return false;
  }

  // if anything else, retry
  return true;
};
