/**
 * Query hooks regarding sections.
 */

import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { RawAttendance, Section, Spacetime, Student } from "../types";
import { handleError, ServerError } from "./helpers";

/* ===== Queries ===== */

/**
 * Hook to get a section with a given id.
 */
export const useSection = (id: number): UseQueryResult<Section, ServerError> => {
  const queryResult = useQuery<Section, Error>(["sections", id], async () => {
    const response = await fetchNormalized(`/sections/${id}`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError(`Failed to fetch section ${id}`);
    }
  });

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get the students enrolled in a section.
 */
export const useSectionStudents = (id: number): UseQueryResult<Student[], ServerError> => {
  const queryResult = useQuery<Student[], Error>(["sections", id, "students"], async () => {
    const response = await fetchNormalized(`/sections/${id}/students`);
    if (response.ok) {
      const students = await response.json();
      // sort students by name before returning
      return students.sort((stu1: Student, stu2: Student) =>
        stu1.name.toLowerCase().localeCompare(stu2.name.toLowerCase())
      );
    } else {
      throw new ServerError(`Failed to fetch section ${id} students`);
    }
  });

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get the attendances for a section.
 */
export const useSectionAttendances = (id: number): UseQueryResult<RawAttendance[], ServerError> => {
  const queryResult = useQuery<RawAttendance[], Error>(["sections", id, "attendance"], async () => {
    const response = await fetchNormalized(`/sections/${id}/attendance`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError(`Failed to fetch section ${id} attendances`);
    }
  });

  handleError(queryResult);
  return queryResult;
};

/* ===== Mutations ===== */

export interface StudentDropMutationBody {
  banned: boolean;
}

/**
 * Hook to drop a student from their section
 */
export const useStudentDropMutation = (
  studentId: number,
  sectionId: number,
  droppedSelf = false
): UseMutationResult<void, ServerError, StudentDropMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, StudentDropMutationBody>(
    async (body: StudentDropMutationBody) => {
      const response = await fetchWithMethod(`students/${studentId}/drop`, HTTP_METHODS.PATCH, body);
      if (response.ok) {
        return;
      } else {
        throw new ServerError(`Failed to drop student ${studentId} from section ${sectionId}`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]);

        if (droppedSelf) {
          // invalidate profiles query
          queryClient.invalidateQueries(["profiles"]);
        }
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

export interface EnrollStudentMutationResponse {
  detail: string;
}

/**
 * Enroll a student (the user) into a given section.
 *
 * If the mutation fails,
 */
export const useEnrollStudentMutation = (
  sectionId: number
): UseMutationResult<void, EnrollStudentMutationResponse, void> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, EnrollStudentMutationResponse, void>(
    async () => {
      const response = await fetchWithMethod(`sections/${sectionId}/students`, HTTP_METHODS.PUT);
      if (response.ok) {
        return;
      } else {
        throw await response.json();
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]);
        // invalidate profiles query for the user
        queryClient.invalidateQueries(["profiles"]);
      }
    }
  );

  // handle error in component
  return mutationResult;
};

export interface SectionCreateMutationBody {
  mentorEmail: string;
  spacetimes: Spacetime[];
  description: string;
  capacity: string;
  courseId: number;
}

/**
 * Hook to create a new section
 */
export const useSectionCreateMutation = (): UseMutationResult<Section, ServerError, SectionCreateMutationBody> => {
  const mutationResult = useMutation<Section, Error, SectionCreateMutationBody>(
    async (body: SectionCreateMutationBody) => {
      const response = await fetchWithMethod(`sections`, HTTP_METHODS.POST, body);
      if (response.ok) {
        return response.json();
      } else {
        throw new ServerError(`Failed to create section`);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
