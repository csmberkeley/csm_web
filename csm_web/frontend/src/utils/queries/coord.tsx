import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { handleError, handleRetry, handlePermissionsError, PermissionError, ServerError } from "./helpers";

export interface Student {
  id: number;
  name: string;
  email: string;
  numUnexcused: number;
  section: number;
  mentorName: string;
  dayTime: string;
}

export interface Mentor {
  id: number;
  name: string;
  email: string;
  numStudents: number;
  section: number;
  family: string;
  dayTime: string;
}

export const getCoordData = async (courseId: number, isStudents: boolean) => {
  // query disabled when id undefined
  if (isNaN(courseId!)) {
    throw new PermissionError("Invalid course id");
  }
  const response = await fetchNormalized(`/coord/${courseId}/${isStudents ? "students" : "mentors"}`);
  if (response.ok) {
    return await response.json();
  } else {
    handlePermissionsError(response.status);
    throw new ServerError(`Failed to fetch coord course ${courseId}`);
  }
};

export interface StudentDropMutationBody {
  banned: boolean;
  blacklisted: boolean;
}

/**
 * Hook to drop a student from their section though the coord interface.
 * Invalidates all queries associated with the section.
 * (insprition from /queries/sections.tsx)
 */

export const useCoordDropStudentMutation = (
  studentId: number,
  sectionId: number
): UseMutationResult<void, ServerError, StudentDropMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, StudentDropMutationBody>(
    async (body: StudentDropMutationBody) => {
      if (isNaN(studentId) || isNaN(sectionId)) {
        throw new PermissionError("Invalid section id");
      }
      const response = await fetchWithMethod(`coord/${studentId}/drop_students`, HTTP_METHODS.PATCH, body); // changed this to match the path within urls.py
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to drop student ${studentId} from section ${sectionId}`);
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
 * Hook to delete a section though the coord interface.
 * Invalidates all queries associated with the section.
 * (insprition from /queries/sections.tsx, but there wasn't a delete section sooo)
 */

export const useCoordDeleteSectionMutation = (
  sectionId: number
): UseMutationResult<void, ServerError, StudentDropMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, StudentDropMutationBody>(
    async (body: StudentDropMutationBody) => {
      if (isNaN(sectionId)) {
        throw new PermissionError("Invalid section id");
      }
      const response = await fetchWithMethod(`coord/${sectionId}/section`, HTTP_METHODS.PATCH, body); // changed this to match the path within urls.py
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to delete section ${sectionId}`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]); // might still need this?
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
