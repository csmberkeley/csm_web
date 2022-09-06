/**
 * All query hooks follow the same procedure:
 * - Fetch the data from the backend API
 * - If an error occurs, throw the error with some additional details
 * - Otherwise, return the QueryResult object
 *
 * There is no need for error handling in the frontend;
 * the error boundary in App.tsx will catch any errors and display a friendly error page.
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized } from "../api";
import { Profile, RawUserInfo } from "../types";
import { handleError, ServerError } from "./helpers";

/**
 * Hook to get the user's profile list.
 */
export const useProfiles = (): UseQueryResult<Profile[], ServerError> => {
  const queryResult = useQuery<Profile[], ServerError>(["profiles"], async () => {
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

/**
 * Hook to get the user's info.
 */
export const useUserInfo = (): UseQueryResult<RawUserInfo, ServerError> => {
  const queryResult = useQuery<RawUserInfo, Error>(["userinfo"], async () => {
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

/**
 * Hook to get a list of all user emails.
 */
export const useUserEmails = (): UseQueryResult<string[], ServerError> => {
  const queryResult = useQuery<string[], Error>(["users"], async () => {
    const response = await fetchNormalized("/users");
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError("Failed to fetch user info");
    }
  });

  handleError(queryResult);
  return queryResult;
};
