/**
 * All query hooks follow the same procedure:
 * - Fetch the data from the backend API
 * - If an error occurs, throw the error with some additional details
 * - Otherwise, return the QueryResult object
 *
 * There is no need for error handling in the frontend;
 * the error boundary in App.tsx will catch any errors and display a friendly error page.
 */

import {
  QueryClient,
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult
} from "@tanstack/react-query";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { Profile, RawUserProfileInfo } from "../types";
import { handleError, handlePermissionsError, handleRetry, PermissionError, ServerError } from "./helpers";

/**
 * Hook to get the user's profile list.
 */
export const useProfiles = (): UseQueryResult<Profile[], Error> => {
  const queryResult = useQuery<Profile[], Error>(
    ["profiles"],
    async () => {
      const response = await fetchNormalized("/profiles");
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError("Failed to fetch profiles");
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get the user's info.
 */
export const useUserInfo = (): UseQueryResult<RawUserProfileInfo, Error> => {
  const queryResult = useQuery<RawUserProfileInfo, Error>(
    ["userinfo"],
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

export interface UserInfoUpdateMutationRequest {
  firstName?: string;
  lastName?: string;
  pronouns?: string;
  bio?: string;
}

/**
 * Hook to update the user's own info.
 *
 * Invalidates the user info query on success.
 * Errors are left for the page to display, so unsaved edits aren't lost to the error boundary.
 */
export const useUserInfoUpdateMutation = (): UseMutationResult<
  RawUserProfileInfo,
  ServerError,
  UserInfoUpdateMutationRequest
> => {
  const queryClient = useQueryClient();
  return useMutation<RawUserProfileInfo, ServerError, UserInfoUpdateMutationRequest>(
    async (body: UserInfoUpdateMutationRequest) => {
      const response = await fetchWithMethod("/userinfo", HTTP_METHODS.PATCH, body);
      if (response.ok) {
        return await response.json();
      } else if (response.status === 400) {
        // the generic 4xx message would blame permissions; PermissionError isn't retried
        throw new PermissionError("Please check your profile details and try again.");
      } else {
        handlePermissionsError(response.status);
        throw new ServerError("Failed to update user info");
      }
    },
    {
      // returned so the mutation stays loading until the page has the saved values
      onSuccess: () => queryClient.invalidateQueries(["userinfo"]),
      retry: handleRetry
    }
  );
};

/**
 * Store a photo endpoint's response as the current user info.
 */
const storeUserInfoResponse = async (queryClient: QueryClient, data: RawUserProfileInfo): Promise<void> => {
  // an in-flight refetch may have read the old photo, and would overwrite this response
  await queryClient.cancelQueries(["userinfo"]);
  queryClient.setQueryData(["userinfo"], data);
};

/**
 * Hook to upload the user's own profile photo.
 *
 * Errors are left for the page to display next to the photo.
 */
export const useUserPhotoUploadMutation = (): UseMutationResult<RawUserProfileInfo, ServerError, File> => {
  const queryClient = useQueryClient();
  return useMutation<RawUserProfileInfo, ServerError, File>(
    async (photo: File) => {
      const body = new FormData();
      body.append("photo", photo);
      const response = await fetchWithMethod("/userinfo/photo", HTTP_METHODS.POST, body, true);
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 400) {
        // validation failures carry a message for the user; check before the generic 4xx handling
        const error = await response.json().catch(() => null);
        throw new ServerError(error?.detail ?? "Failed to upload photo");
      }
      handlePermissionsError(response.status);
      throw new ServerError("Failed to upload photo");
    },
    {
      onSuccess: data => storeUserInfoResponse(queryClient, data)
    }
  );
};

/**
 * Hook to remove the user's own profile photo.
 */
export const useUserPhotoRemoveMutation = (): UseMutationResult<RawUserProfileInfo, ServerError, void> => {
  const queryClient = useQueryClient();
  return useMutation<RawUserProfileInfo, ServerError, void>(
    async () => {
      const response = await fetchWithMethod("/userinfo/photo", HTTP_METHODS.DELETE);
      if (response.ok) {
        return await response.json();
      }
      handlePermissionsError(response.status);
      throw new ServerError("Failed to remove photo");
    },
    {
      onSuccess: data => storeUserInfoResponse(queryClient, data)
    }
  );
};
