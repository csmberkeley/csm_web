import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";

import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { RawUserInfo } from "../types";
import { handleError, handlePermissionsError, handleRetry, ServerError } from "./helpers";

export interface UpdateUserMutationResponse {
  detail: string;
}

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
  const queryKey = userId ? ["user", userId] : ["user"];

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
export const useUserInfoUpdateMutation = (): UseMutationResult<RawUserInfo, UpdateUserMutationResponse, FormData> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<RawUserInfo, UpdateUserMutationResponse, FormData>(
    async (body: FormData) => {
      const response = await fetchWithMethod(
        `/user/${body.get("id")!.toString()}/update`,
        HTTP_METHODS.PUT,
        body,
        true
      );
      if (response.ok) {
        return await response.json();
      } else {
        throw await response.json();
      }
    },
    {
      onSuccess: () => {
        // Invalidate queries related to the user's profile to ensure fresh data
        console.log("Invalidating query user");
        queryClient.invalidateQueries(["user"]);
      }
    }
  );

  return mutationResult;
};
