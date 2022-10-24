/**
 * Query hooks regarding spacetimes.
 */

import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { fetchWithMethod, HTTP_METHODS } from "../api";
import { handleError, ServerError } from "./helpers";

/* ===== Mutations ===== */

export interface SpacetimeModifyMutationBody {
  day_of_week: string;
  location: string | undefined;
  start_time: string;
}

/**
 * Hook to modify a section's spacetime.
 */
export const useSpacetimeModifyMutation = (
  sectionId: number,
  spacetimeId: number
): UseMutationResult<void, ServerError, SpacetimeModifyMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, SpacetimeModifyMutationBody>(
    async (body: SpacetimeModifyMutationBody) => {
      const response = await fetchWithMethod(`/spacetimes/${spacetimeId}/modify`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return;
      } else {
        throw new ServerError(`Failed to update spacetime ${spacetimeId} for section ${sectionId}`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

export interface SpacetimeOverrideMutationBody {
  location: string | undefined;
  start_time: string;
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
        throw new ServerError(`Failed to override spacetime ${spacetimeId} for section ${sectionId}`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
