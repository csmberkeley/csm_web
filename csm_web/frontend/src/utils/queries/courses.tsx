/**
 * Query hooks regarding courses.
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized } from "../api";
import { Course, Section } from "../types";
import { handleError, handlePermissionsError, handleRetry, PermissionError, ServerError } from "./helpers";

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
