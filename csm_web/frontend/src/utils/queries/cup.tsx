import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { handleError, handlePermissionsError, handleRetry, ServerError } from "./helpers";

export interface LeaderboardEntry {
  id: number;
  familyName: string;
  course: string;
  mentors: string[];
  totalPoints: number;
}

export interface ChallengeEntry {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  points: number;
  maxPoints: number;
}

export const getLeaderboardData = async () => {
  // query disabled when id undefined

  const response = await fetchNormalized(`/cup/leaderboard/`);
  if (response.ok) {
    return await response.json();
  } else {
    handlePermissionsError(response.status);
    throw new ServerError(`Failed to fetch leaderboard data}`);
  }
};

export const getChallenges = async () => {
  // query disabled when id undefined

  const response = await fetchNormalized(`/cup/challenges/`);
  if (response.ok) {
    return await response.json();
  } else {
    handlePermissionsError(response.status);
    throw new ServerError(`Failed to fetch challenges`);
  }
};

export const getFamilyChallenges = async (familyId: number) => {
  const response = await fetchNormalized(`/cup/${familyId}/challenges/`);
  if (response.ok) {
    return await response.json();
  } else {
    handlePermissionsError(response.status);
    throw new ServerError(`Failed to fetch family challenges`);
  }
};

// Mutation functions

export interface AddPointsResponse {
  success: boolean;
  message?: string;
  // Add any other fields your backend actually returns here
}

export interface AddPointsMutationRequest {
  challenge: string;
  points: number;
  family_ids: number[];
}

export const useAddPointsMutation = (): UseMutationResult<AddPointsResponse, Error, AddPointsMutationRequest> => {
  const queryClient = useQueryClient();

  const mutationResult = useMutation<AddPointsResponse, Error, AddPointsMutationRequest>(
    async (body: AddPointsMutationRequest) => {
      const response = await fetchWithMethod(`/cup/add_points/`, HTTP_METHODS.POST, body);

      if (response.ok) {
        return (await response.json()) as AddPointsResponse;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to post challenge points`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["leaderboard"]);
        queryClient.invalidateQueries(["familyChallenges"]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
