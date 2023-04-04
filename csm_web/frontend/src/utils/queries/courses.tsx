/**
 * Query hooks regarding courses.
 */

import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { Course, RawUserInfo, Section } from "../types";
import { handleError, handlePermissionsError, handleRetry, PermissionError, ServerError } from "./helpers";

/* ===== Queries ===== */

/**
 * Hook to get all courses.
 */
export const useCourses = (): UseQueryResult<Course[], ServerError> => {
  const queryResult = useQuery<Course[], Error>(
    ["courses"],
    async () => {
      const response = await fetchNormalized("/courses");
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError("Failed to fetch courses");
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

interface CourseSectionsQueryResponse {
  sections: { [day: string]: Section[] };
  userIsCoordinator: boolean;
}

/**
 * Hook to get all sections for a course.
 */
export const useCourseSections = (
  id: number | undefined,
  onSuccess?: (response: CourseSectionsQueryResponse) => void
): UseQueryResult<CourseSectionsQueryResponse, ServerError> => {
  const queryResult = useQuery<CourseSectionsQueryResponse, Error>(
    ["courses", id, "sections"],
    async () => {
      // query disabled when id undefined
      if (isNaN(id!)) {
        throw new PermissionError("Invalid course id");
      }
      const response = await fetchNormalized(`/courses/${id}/sections`);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to fetch course ${id} sections`);
      }
    },
    {
      enabled: id !== undefined,
      onSuccess: onSuccess,
      retry: handleRetry
    }
  );

  handleError(queryResult);
  return queryResult;
};

interface CourseWhitelistedEmailsResponse {
  users: RawUserInfo[];
}

export const useCourseWhitelistedEmails = (
  id: number
): UseQueryResult<CourseWhitelistedEmailsResponse, ServerError> => {
  const queryResult = useQuery<CourseWhitelistedEmailsResponse, Error>(
    ["courses", id, "whitelist"],
    async () => {
      // query disabled when id undefined
      if (isNaN(id!)) {
        throw new PermissionError("Invalid course id");
      }
      const response = await fetchNormalized(`/courses/${id}/whitelist`);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to fetch course ${id} whitelist`);
      }
    },
    {
      enabled: id !== undefined,
      retry: handleRetry
    }
  );

  handleError(queryResult);
  return queryResult;
};

/* ===== Mutations ===== */

interface CourseAddWhitelistMutationRequest {
  emails: string[];
}

export const useCourseAddWhitelistMutation = (
  courseId: number
): UseMutationResult<void, ServerError, CourseAddWhitelistMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, CourseAddWhitelistMutationRequest>(
    async (body: CourseAddWhitelistMutationRequest) => {
      if (isNaN(courseId)) {
        throw new PermissionError("Invalid course id");
      }
      const response = await fetchWithMethod(`/courses/${courseId}/whitelist`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to update whitelist for course ${courseId}`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["courses", courseId, "whitelist"]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

interface CourseDeleteWhitelistMutationRequest {
  emails: string[];
}

export const useCourseDeleteWhitelistMutation = (
  courseId: number
): UseMutationResult<void, ServerError, CourseDeleteWhitelistMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, CourseDeleteWhitelistMutationRequest>(
    async (body: CourseDeleteWhitelistMutationRequest) => {
      if (isNaN(courseId)) {
        throw new PermissionError("Invalid course id");
      }
      const response = await fetchWithMethod(`/courses/${courseId}/whitelist`, HTTP_METHODS.DELETE, body);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to update whitelist for course ${courseId}`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["courses", courseId, "whitelist"]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

interface CourseSettingsMutationBody {
  // limit as duration in the form '[DD] [HH:[MM:]]ss[.uuuuuu]'
  // if null, treated in backend as no limit
  wordOfTheDayLimit: string | null;
}

/**
 * Hook to update course settings.
 */
export const useCourseSettingsMutation = (
  courseId: number
): UseMutationResult<Course, ServerError, CourseSettingsMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<Course, Error, CourseSettingsMutationBody>(
    async (body: CourseSettingsMutationBody) => {
      if (isNaN(courseId)) {
        throw new PermissionError("Invalid course id");
      }
      const response = await fetchWithMethod(`/courses/${courseId}/config`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to update course settings for course ${courseId}`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["courses"]);
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
