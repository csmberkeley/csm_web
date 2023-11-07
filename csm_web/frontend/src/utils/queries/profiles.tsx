/**
 * Query hooks regarding sections.
 */

import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { handleError, handlePermissionsError, handleRetry, PermissionError, ServerError } from "./helpers";
import { DateTime } from "luxon";
import { RawUserInfo } from "../types";

/* ===== Mutation ===== */
/**
 * Hook to mutate user info
 */
export interface UpdateUserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  priorityEnrollment?: DateTime;
  isPrivate: boolean;
  bio: string;
  pronouns: string;
}

/**
 * Hook to get the user's info.
 */
export const useStudentsInfo = (): UseQueryResult<RawUserInfo, Error> => {
  const queryResult = useQuery<RawUserInfo, Error>(
    ["students"],
    async () => {
      const response = await fetchNormalized("/students");
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

export const useUserInfoUpdateMutation = (userId: number): UseMutationResult<void, ServerError, UpdateUserInfo> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, UpdateUserInfo>(
    async (body: UpdateUserInfo) => {
      if (isNaN(userId)) {
        throw new PermissionError("Invalid user id");
      }
      const response = await fetchWithMethod(`/user/${userId}/profile`, HTTP_METHODS.PATCH, body);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to update user info`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["userinfo"]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

/**
 * Hook to get a section with a given id.
 */
export const UseUserInfoWithId = (id: number): UseQueryResult<RawUserInfo, Error> => {
  const queryResult = useQuery<RawUserInfo, Error>(
    ["userinfo", id],
    async () => {
      const response = await fetchNormalized("/userinfo");
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
