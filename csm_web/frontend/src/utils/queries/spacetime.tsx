/**
 * Query hooks regarding spacetimes.
 */

import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { fetchWithMethod, HTTP_METHODS } from "../api";
import { Spacetime } from "../types";
import { handleError, handlePermissionsError, handleRetry, PermissionError, ServerError } from "./helpers";

/* ===== Mutations ===== */

/**
 * Hook to modify a section's spacetime.
 */
export const useSpacetimeModifyMutation = (
  sectionId: number,
  spacetimeId: number
): UseMutationResult<void, ServerError, Partial<Spacetime>> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, Partial<Spacetime>>(
    async (body: Partial<Spacetime>) => {
      const response = await fetchWithMethod(`/spacetimes/${spacetimeId}/modify`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to update spacetime ${spacetimeId} for section ${sectionId}`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

/**
 * Hook to delete a section's spacetime.
 */
export const useSpacetimeDeleteMutation = (
  sectionId: number,
  spacetimeId: number
): UseMutationResult<void, Error, void> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, void>(
    async () => {
      const response = await fetchWithMethod(`/spacetimes/${spacetimeId}`, HTTP_METHODS.DELETE);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to delete spacetime ${spacetimeId} for section ${sectionId}`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

export interface SpacetimeOverrideMutationBody {
  location: string | undefined;
  startTime: string;
  date: string;
}

/**
 * Hook to override a section's spacetime.
 */
export const useSpacetimeOverrideMutation = (
  sectionId: number,
  spacetimeId: number
): UseMutationResult<void, ServerError, SpacetimeOverrideMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, SpacetimeOverrideMutationBody>(
    async (body: SpacetimeOverrideMutationBody) => {
      const response = await fetchWithMethod(`/spacetimes/${spacetimeId}/override`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to override spacetime ${spacetimeId} for section ${sectionId}`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

/**
 * Hook to delete a section's spacetime override.
 */
export const useSpacetimeOverrideDeleteMutation = (
  sectionId: number,
  spacetimeId: number
): UseMutationResult<void, Error, void> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, void>(
    async () => {
      if (isNaN(sectionId) || isNaN(spacetimeId)) {
        throw new PermissionError("Invalid section or spacetime ID");
      }
      const response = await fetchWithMethod(`/spacetimes/${spacetimeId}/override`, HTTP_METHODS.DELETE);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to delete spacetime override ${spacetimeId} for section ${sectionId}`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
