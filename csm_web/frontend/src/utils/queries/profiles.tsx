/**
 * Query hooks regarding sections.
 */

import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { handleError, handlePermissionsError, handleRetry, PermissionError, ServerError } from "./helpers";
import { DateTime } from "luxon";

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

export const useUserInfoUpdateMutation = (userId: number): UseMutationResult<void, ServerError, UpdateUserInfo> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, UpdateUserInfo>(
    async (body: UpdateUserInfo) => {
      if (isNaN(userId)) {
        throw new PermissionError("Invalid user id");
      }
      const response = await fetchWithMethod(`/users/${userId}/`, HTTP_METHODS.PATCH, body);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to create section`);
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
