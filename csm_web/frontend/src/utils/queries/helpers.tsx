/**
 * Helper functions for query hooks.
 */

import { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

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
 * Handle errors from the backend API, if any occur.
 * If no error, nothing happens.
 */
export const handleError = (
  result: UseQueryResult<any, ServerError> | UseMutationResult<any, ServerError, any>
): void => {
  if (result.isError) {
    const failures = result.failureCount;
    throw new ServerError(`${result.error.message} (${failures} failures)`);
  }
};
