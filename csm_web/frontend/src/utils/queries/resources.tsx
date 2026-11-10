/**
 * Query hooks regarding resources.
 */

import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { Resource } from "../../components/resource_aggregation/ResourceTypes";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { handleError, handlePermissionsError, handleRetry, PermissionError, ServerError } from "./helpers";

/* ===== Queries ===== */

export const useResources = (courseId: number): UseQueryResult<Resource[], ServerError> => {
  const queryResult = useQuery<Resource[], Error>(
    ["resources", courseId],
    async () => {
      if (isNaN(courseId)) {
        throw new PermissionError("Invalid course id");
      }
      const response = await fetchNormalized(`/resources/${courseId}/resources`);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to fetch resources for course ${courseId}`);
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

/* ===== Mutations ===== */

export const useCreateResourceMutation = (courseId: number): UseMutationResult<void, ServerError, FormData> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, FormData>(
    async (formdata: FormData) => {
      if (isNaN(courseId)) {
        throw new PermissionError("Invalid course id");
      }
      const response = await fetchWithMethod(`/resources/${courseId}/resources`, HTTP_METHODS.POST, formdata, true);
      if (response.ok) {
        return await response.json();
      }

      if (response.status === 400) {
        console.error(await response.json());
        throw new ServerError("The resource contains invalid data. Check the fields and try again.");
      }

      handlePermissionsError(response.status);
      throw new ServerError(`Failed to create resource for course ${courseId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["resources", courseId]);
      },
      // Multipart mutations are not retried because a repeated upload could create duplicate resources or files.
      retry: false
    }
  );

  return mutationResult;
};

export const useUpdateResourceMutation = (courseId: number): UseMutationResult<void, ServerError, FormData> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, FormData>(
    async (formdata: FormData) => {
      if (isNaN(courseId)) {
        throw new PermissionError("Invalid course id");
      }
      const response = await fetchWithMethod(`/resources/${courseId}/resources`, HTTP_METHODS.PUT, formdata, true);
      if (response.ok) {
        return await response.json();
      }

      if (response.status === 400) {
        console.error(await response.json());
        throw new ServerError("The resource contains invalid data. Check the fields and try again.");
      }

      handlePermissionsError(response.status);
      throw new ServerError(`Failed to update resource for course ${courseId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["resources", courseId]);
      },
      // Multipart mutations are not retried because a repeated upload could create duplicate resources or files.
      retry: false
    }
  );

  return mutationResult;
};

interface DeleteResourceMutationRequestBody {
  id: number;
}

export const useDeleteResourceMutation = (
  courseId: number
): UseMutationResult<void, ServerError, DeleteResourceMutationRequestBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, DeleteResourceMutationRequestBody>(
    async (body: DeleteResourceMutationRequestBody) => {
      if (isNaN(courseId)) {
        throw new PermissionError("Invalid course id");
      }
      const response = await fetchWithMethod(`/resources/${courseId}/resources`, HTTP_METHODS.DELETE, body);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to delete resource ${body.id} for course ${courseId}`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["resources", courseId]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
