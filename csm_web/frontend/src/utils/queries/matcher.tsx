/**
 * Query hooks regarding the matcher.
 */

import {
  QueryClient,
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult
} from "@tanstack/react-query";
import { Assignment, Slot } from "../../components/enrollment_automation/EnrollmentAutomationTypes";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { Mentor } from "../types";
import { handleError, ServerError } from "./helpers";

/* ==== Queries ===== */

export const useMatcherActiveCourses = (): UseQueryResult<number[], ServerError> => {
  const queryResult = useQuery<number[], Error>(["matcher", "active"], async () => {
    const response = await fetchNormalized("/matcher/active");
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError("Failed to fetch active matcher courses");
    }
  });

  handleError(queryResult);
  return queryResult;
};

interface MatcherSlotsResponse {
  slots: Array<{
    id: number;
    times: MatcherSlotsResponseTime[];
  }>;
}

/**
 * Variant on Time interface with string times
 */
interface MatcherSlotsResponseTime {
  day: string;
  startTime: string;
  endTime: string;
  isLinked: boolean;
}

/**
 * Hook to fetch the matcher slots for a given course.
 */
export const useMatcherSlots = (courseId: number): UseQueryResult<MatcherSlotsResponse, ServerError> => {
  const queryResult = useQuery<MatcherSlotsResponse, Error>(["matcher", courseId, "slots"], async () => {
    const response = await fetchNormalized(`/matcher/${courseId}/slots`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError(`Failed to fetch matcher slots for course ${courseId}`);
    }
  });

  handleError(queryResult);
  return queryResult;
};

interface MatcherPreferencesResponse {
  responses: Array<{ slot: number; mentor: number; preference: number }>;
}

export const useMatcherPreferences = (courseId: number): UseQueryResult<MatcherPreferencesResponse, ServerError> => {
  const queryResult = useQuery<MatcherPreferencesResponse, Error>(["matcher", courseId, "preferences"], async () => {
    const response = await fetchNormalized(`/matcher/${courseId}/preferences`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError("Failed to fetch matcher preferences");
    }
  });

  handleError(queryResult);
  return queryResult;
};

interface MatcherConfigResponse {
  open: boolean;
  slots: Array<{
    id: number;
    minMentors: number;
    maxMentors: number;
  }>;
}

export const useMatcherConfig = (courseId: number): UseQueryResult<MatcherConfigResponse, ServerError> => {
  const queryResult = useQuery<MatcherConfigResponse, Error>(["matcher", courseId, "config"], async () => {
    const response = await fetchNormalized(`/matcher/${courseId}/configure`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError(`Failed to fetch matcher config for course ${courseId}`);
    }
  });

  handleError(queryResult);
  return queryResult;
};

interface MatcherAssignmentResponse {
  assignment: Assignment[];
}

export const useMatcherAssignment = (courseId: number): UseQueryResult<MatcherAssignmentResponse, ServerError> => {
  const queryResult = useQuery<MatcherAssignmentResponse, Error>(["matcher", courseId, "assignment"], async () => {
    const response = await fetchNormalized(`/matcher/${courseId}/assignment`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError(`Failed to fetch matcher assignment for course ${courseId}`);
    }
  });

  handleError(queryResult);
  return queryResult;
};

interface MatcherMentorsResponse {
  mentors: Mentor[];
}

export const useMatcherMentors = (courseId: number): UseQueryResult<MatcherMentorsResponse, ServerError> => {
  const queryResult = useQuery<MatcherMentorsResponse, Error>(["matcher", courseId, "mentors"], async () => {
    const response = await fetchNormalized(`/matcher/${courseId}/mentors`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError(`Failed to fetch matcher mentors for course ${courseId}`);
    }
  });

  handleError(queryResult);
  return queryResult;
};

/* ===== Mutations ===== */

type MatcherPreferenceMutationRequest = Array<{
  id: number;
  preference: number;
}>;

export const useMatcherPreferenceMutation = (
  courseId: number
): UseMutationResult<boolean, ServerError, MatcherPreferenceMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<boolean, Error, MatcherPreferenceMutationRequest>(
    async (body: MatcherPreferenceMutationRequest) => {
      const response = await fetchWithMethod(`/matcher/${courseId}/preferences`, HTTP_METHODS.POST, body);
      if (!response.ok && response.status === 500) {
        throw new ServerError(`Failed to update matcher preferences for course ${courseId}`);
      }
      return response.ok;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["matcher", courseId, "preferences"]);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

interface MatcherSlotsMutationRequest {
  slots: Array<{
    id?: number;
    times: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
  }>;
}

export const useMatcherSlotsMutation = (
  courseId: number
): UseMutationResult<void, ServerError, MatcherSlotsMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, MatcherSlotsMutationRequest>(
    async (body: MatcherSlotsMutationRequest) => {
      const response = await fetchWithMethod(`/matcher/${courseId}/slots`, HTTP_METHODS.POST, body);
      if (response.ok) {
        return;
      } else {
        throw new ServerError(`Failed to create matcher slots for course ${courseId}`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["matcher", courseId, "slots"]);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

interface MatcherConfigMutationRequest {
  open?: boolean;
  run?: boolean;
  slots?: Array<{
    id?: number;
    minMentors?: number;
    maxMentors?: number;
  }>;
}

interface MatcherConfigMutationResponse {
  error?: string;
}

/**
 * Hook to modify matcher configuration.
 *
 * Used to open/close the matcher, run the matcher, and modify the configuration of the matcher algorithm.
 *
 * @param courseId The course ID to modify the matcher configuration for.
 * @param invalidateAssignments Whether to invalidate the matcher assignment query when the mutation is successful.
 *                            Used when running the matcher to update the stage.
 */
export const useMatcherConfigMutation = (
  courseId: number,
  invalidateAssignments = false
): UseMutationResult<void, MatcherConfigMutationResponse, MatcherConfigMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, MatcherConfigMutationResponse, MatcherConfigMutationRequest>(
    async (body: MatcherConfigMutationRequest) => {
      const response = await fetchWithMethod(`/matcher/${courseId}/configure`, HTTP_METHODS.POST, body);
      if (response.ok) {
        return;
      } else {
        throw await response.json();
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["matcher", courseId, "config"]);
        if (invalidateAssignments) {
          queryClient.invalidateQueries(["matcher", courseId, "assignment"]);
        }
      }
    }
  );

  // handle error in mutation
  return mutationResult;
};

interface MatcherAssignmentMutationRequest {
  assignment: Assignment[];
}

export const useMatcherAssignmentMutation = (
  courseId: number
): UseMutationResult<void, ServerError, MatcherAssignmentMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, MatcherAssignmentMutationRequest>(
    async (body: MatcherAssignmentMutationRequest) => {
      const response = await fetchWithMethod(`/matcher/${courseId}/assignment`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return;
      } else {
        throw new ServerError(`Failed to update matcher assignment for course ${courseId}`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["matcher", courseId, "assignment"]);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

interface MatcherMentorsMutationRequest {
  mentors: string[];
}

interface MatcherMentorsMutationResponse {
  skipped: string[];
}

export const useMatcherAddMentorsMutation = (
  courseId: number
): UseMutationResult<MatcherMentorsMutationResponse, ServerError, MatcherMentorsMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<MatcherMentorsMutationResponse, Error, MatcherMentorsMutationRequest>(
    async (body: MatcherMentorsMutationRequest) => {
      const response = await fetchWithMethod(`/matcher/${courseId}/mentors`, HTTP_METHODS.POST, body);
      if (response.ok) {
        return response.json();
      } else {
        throw new ServerError(`Failed to update matcher mentors for course ${courseId}`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["matcher", courseId, "mentors"]);
        // possibly added the current user, so reload profiles too
        queryClient.invalidateQueries(["profiles"]);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

export const useMatcherRemoveMentorsMutation = (
  courseId: number
): UseMutationResult<void, ServerError, MatcherMentorsMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, MatcherMentorsMutationRequest>(
    async (body: MatcherMentorsMutationRequest) => {
      const response = await fetchWithMethod(`/matcher/${courseId}/mentors`, HTTP_METHODS.DELETE, body);
      if (response.ok) {
        return;
      } else {
        throw new ServerError(`Failed to update matcher mentors for course ${courseId}`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["matcher", courseId, "mentors"]);
        // possibly removed the current user, so reload profiles too
        queryClient.invalidateQueries(["profiles"]);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

interface MatcherCreateSectionsMutationRequest {
  assignment: Assignment[];
}

interface MatcherCreateSectionsMutationResponse {
  error?: string;
}

export const useMatcherCreateSectionsMutation = (
  courseId: number
): UseMutationResult<void, MatcherCreateSectionsMutationResponse, MatcherCreateSectionsMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, MatcherCreateSectionsMutationResponse, MatcherCreateSectionsMutationRequest>(
    async (body: MatcherCreateSectionsMutationRequest) => {
      const response = await fetchWithMethod(`/matcher/${courseId}/create`, HTTP_METHODS.POST, body);
      if (response.ok) {
        return;
      } else {
        throw await response.json();
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["matcher", courseId]);
        queryClient.invalidateQueries(["matcher", "active"]);
        queryClient.invalidateQueries(["profiles"]);
      }
    }
  );

  // handle error in component
  return mutationResult;
};
