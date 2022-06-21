/**
 * File containing all the query functions for the frontend.
 * All query hooks follow the same procedure:
 * - Fetch the data from the backend API
 * - If an error occurs, throw the error with some additional details
 * - Otherwise, return the QueryResult object
 *
 * There is no need for error handling in the frontend;
 * the error boundary in App.tsx will catch any errors and display a friendly error page.
 */

import { useQuery, UseQueryResult } from "react-query";

import { fetchNormalized } from "./api";
import { Course, Profile, RawUserInfo } from "./types";

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
const handleError = (queryResult: UseQueryResult<any, ServerError>): void => {
  if (queryResult.isError) {
    const failures = queryResult.failureCount;
    throw new ServerError(`${queryResult.error.message} (${failures} failures)`);
  }
};

/**
 * Hook to get the user's profile list.
 */
export const useProfiles = () => {
  const queryResult = useQuery<Profile[], ServerError>("profiles", async () => {
    const response = await fetchNormalized("/profiles");
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError("Failed to fetch profiles");
    }
  });

  handleError(queryResult);
  return queryResult;
};

export const useCourses = (): UseQueryResult<Course[], ServerError> => {
  const queryResult = useQuery<Course[], Error>("courses", async () => {
    const response = await fetchNormalized("/courses");
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError("Failed to fetch courses");
    }
  });

  handleError(queryResult);
  return queryResult;
};

export const useUserInfo = (): UseQueryResult<RawUserInfo, ServerError> => {
  const queryResult = useQuery<RawUserInfo, Error>("userinfo", async () => {
    const response = await fetchNormalized("/userinfo");
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError("Failed to fetch user info");
    }
  });

  handleError(queryResult);
  return queryResult;
};
