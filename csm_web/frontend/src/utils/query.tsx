/**
 * File containing all the query functions for the frontend.
 * All query hooks follow the same procedure:
 * - Fetch the data from the backend API
 * - If an error occurs, throw the error with some additional details
 * - Otherwise, return the QueryResult object
 *
 * There is no need for error handling in the frontend;
 * the error boundary in App.tsx will catch any errors and display a friendly error page.
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from "react-query";

import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "./api";
import { RawAttendance, Course, Profile, RawUserInfo, Section, Student } from "./types";

/**
 * Derived class of Error for internal server errors.
 */
export class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}

/**
 * Handle errors from the backend API, if any occur.
 * If no error, nothing happens.
 */
const handleError = (result: UseQueryResult<any, ServerError> | UseMutationResult<any, ServerError, any>): void => {
  if (result.isError) {
    const failures = result.failureCount;
    throw new ServerError(`${result.error.message} (${failures} failures)`);
  }
};

/* === Queries === */

/**
 * Hook to get the user's profile list.
 */
export const useProfiles = () => {
  const queryResult = useQuery<Profile[], ServerError>("profiles", async () => {
    const response = await fetchNormalized("/profiles");
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError("Failed to fetch profiles");
    }
  });

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get all courses.
 */
export const useCourses = (): UseQueryResult<Course[], ServerError> => {
  const queryResult = useQuery<Course[], Error>("courses", async () => {
    const response = await fetchNormalized("/courses");
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError("Failed to fetch courses");
    }
  });

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get the user's info.
 */
export const useUserInfo = (): UseQueryResult<RawUserInfo, ServerError> => {
  const queryResult = useQuery<RawUserInfo, Error>("userinfo", async () => {
    const response = await fetchNormalized("/userinfo");
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError("Failed to fetch user info");
    }
  });

  handleError(queryResult);
  return queryResult;
};

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

/* === Mutations === */

export interface StudentDropMutationBody {
  banned: boolean;
}

/**
 * Hook to drop a student from their section
 */
export const useStudentDropMutation = (
  studentId: number,
  sectionId: number
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
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
