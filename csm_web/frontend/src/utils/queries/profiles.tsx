import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";

import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
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
 * Hook to get user info. If userId is provided, fetches details for that user;
 * otherwise, fetches current user's info.
 */
export const useUserInfo = (userId?: number): UseQueryResult<RawUserInfo, Error> => {
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
      retry: handleRetry
    }
  );

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to update a user's profile information.
 */
export const useUserInfoUpdateMutation = (
  userId: number
): UseMutationResult<void, ServerError, Partial<RawUserInfo>> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, Partial<RawUserInfo>>(
    async (body: Partial<RawUserInfo>) => {
      const response = await fetchWithMethod(`/user/${userId}/update`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to update user profile with ID ${userId}`);
      }
    },
    {
      onSuccess: () => {
        // Invalidate queries related to the user's profile to ensure fresh data
        queryClient.invalidateQueries(["userProfile", userId]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
