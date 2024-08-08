import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized } from "../api";
import { RawUserInfo } from "../types";
import { handleError, handlePermissionsError, handleRetry, ServerError } from "./helpers";

/**
 * Hook to get a list of all user emails.
 */
export const useUserEmails = (): UseQueryResult<string[], Error> => {
  const queryResult = useQuery<string[], Error>(
    ["users"],
    async () => {
      const response = await fetchNormalized("/users");
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError("Failed to fetch user info");
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get the current user's info.
 */
// TODO: merge with useUserDetails
export const useUserInfo = (): UseQueryResult<RawUserInfo, Error> => {
  const queryResult = useQuery<RawUserInfo, Error>(
    ["user"],
    async () => {
      const response = await fetchNormalized("/user");
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError("Failed to fetch user info");
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get the requested user's info
 */
// TODO: handle if there is no userId
export const useUserDetails = (userId?: number): UseQueryResult<RawUserInfo, Error> => {
  const queryResult = useQuery<RawUserInfo, Error>(
    ["userDetails", userId],
    async () => {
      const response = await fetchNormalized(`/user/${userId}`);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError("Failed to fetch user details");
      }
    },
    {
      retry: handleRetry,
      enabled: !!userId // only run query if userId is available
    }
  );

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get user info. If userId is provided, fetches details for that user; otherwise, fetches current user's info.
 */
export const useUser = (userId?: number): UseQueryResult<RawUserInfo, Error> => {
  const queryKey = userId ? ["userDetails", userId] : ["user"];

  const queryResult = useQuery<RawUserInfo, Error>(
    queryKey,
    async () => {
      const endpoint = userId ? `/user/${userId}` : "/user";
      const response = await fetchNormalized(endpoint);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(userId ? "Failed to fetch user details" : "Failed to fetch user info");
      }
    },
    {
      retry: handleRetry,
      enabled: userId !== undefined // Only run the query if userId is provided or if fetching current user's info
    }
  );

  handleError(queryResult);
  return queryResult;
};
