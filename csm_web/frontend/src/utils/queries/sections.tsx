/**
 * Query hooks regarding sections.
 */

import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { Attendance, RawAttendance, Section, Spacetime, Student } from "../types";
import { handleError, handlePermissionsError, handleRetry, PermissionError, ServerError } from "./helpers";

/* ===== Queries ===== */

/**
 * Hook to get a section with a given id.
 */
export const useSection = (id: number): UseQueryResult<Section, ServerError> => {
  const queryResult = useQuery<Section, Error>(
    ["sections", id],
    async () => {
      if (isNaN(id)) {
        throw new PermissionError("Invalid section id");
      }
      const response = await fetchNormalized(`/sections/${id}`);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to fetch section ${id}`);
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get the students enrolled in a section.
 *
 * List of students is sorted by name.
 */
export const useSectionStudents = (id: number): UseQueryResult<Student[], ServerError> => {
  const queryResult = useQuery<Student[], Error>(
    ["sections", id, "students"],
    async () => {
      if (isNaN(id)) {
        throw new PermissionError("Invalid section id");
      }
      const response = await fetchNormalized(`/sections/${id}/students`);
      if (response.ok) {
        const students = await response.json();
        // sort students by name before returning
        return students.sort((stu1: Student, stu2: Student) =>
          stu1.name.toLowerCase().localeCompare(stu2.name.toLowerCase())
        );
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to fetch section ${id} students`);
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

/**
 * Hook to get the attendances for a section.
 */
export const useSectionAttendances = (id: number): UseQueryResult<RawAttendance[], ServerError> => {
  const queryResult = useQuery<RawAttendance[], Error>(
    ["sections", id, "attendance"],
    async () => {
      if (isNaN(id)) {
        throw new PermissionError("Invalid section id");
      }
      const response = await fetchNormalized(`/sections/${id}/attendance`);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to fetch section ${id} attendances`);
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

export const useStudentAttendances = (studentId: number): UseQueryResult<Attendance[], ServerError> => {
  const queryResult = useQuery<Attendance[], Error>(
    ["students", studentId, "attendance"],
    async () => {
      if (isNaN(studentId)) {
        throw new PermissionError("Invalid student id");
      }
      const response = await fetchNormalized(`/students/${studentId}/attendances`);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to fetch student ${studentId} attendances`);
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

interface WordOfTheDayResponse {
  id: number; // section occurrence id
  wordOfTheDay: string;
}

export const useWordOfTheDay = (sectionId: number): UseQueryResult<WordOfTheDayResponse[], ServerError> => {
  const queryResult = useQuery<WordOfTheDayResponse[], Error>(
    ["wordoftheday", sectionId],
    async () => {
      if (isNaN(sectionId)) {
        throw new PermissionError("Invalid section id");
      }
      const response = await fetchNormalized(`/sections/${sectionId}/wotd`);
      if (response.ok) {
        return await response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to fetch section ${sectionId} word of the day`);
      }
    },
    { retry: handleRetry }
  );

  handleError(queryResult);
  return queryResult;
};

/* ===== Mutations ===== */

export interface UpdateStudentAttendanceBody {
  attendanceId: number;
  studentId: number;
  presence: string;
}
export interface UpdateStudentAttendancesMutationParams {
  attendances: UpdateStudentAttendanceBody[];
}

export const useUpdateStudentAttendancesMutation = (
  sectionId: number
): UseMutationResult<void, ServerError, UpdateStudentAttendancesMutationParams> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, UpdateStudentAttendancesMutationParams>(
    async ({ attendances }: UpdateStudentAttendancesMutationParams) => {
      if (isNaN(sectionId)) {
        throw new PermissionError("Invalid section id");
      }
      const responses = await Promise.all(
        attendances.map(({ attendanceId, studentId, presence }) => {
          if (isNaN(studentId) || isNaN(attendanceId)) {
            throw new PermissionError("Invalid student id");
          }
          return fetchWithMethod(`/students/${studentId}/attendances/`, HTTP_METHODS.PUT, {
            id: attendanceId,
            presence
          });
        })
      );
      // ensure all requests succeeded
      if (responses.every(response => response.ok)) {
        return;
      } else {
        const failedResponses = responses.filter(response => !response.ok);
        failedResponses.map(response => handlePermissionsError(response.status));
        throw new ServerError(`Failed to save attendances for students.`);
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId, "attendance"]);
      },
      retry: handleRetry
    }
  );
  handleError(mutationResult);
  return mutationResult;
};

interface UpdateWordOfTheDayMutationBody {
  sectionOccurrenceId: number;
  wordOfTheDay: string;
}

/**
 * Hook to update the word of the day for mentors.
 *
 * Invalidates any existing query for the word of the day.
 */
export const useUpdateWordOfTheDayMutation = (
  sectionId: number
): UseMutationResult<void, ServerError, UpdateWordOfTheDayMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, UpdateWordOfTheDayMutationBody>(
    async (body: UpdateWordOfTheDayMutationBody) => {
      if (isNaN(sectionId)) {
        throw new PermissionError("Invalid section id");
      }
      const response = await fetchWithMethod(`sections/${sectionId}/wotd`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to update word of the day for section ${sectionId}`);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["wordoftheday", sectionId]);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

interface StudentSubmitWordOfTheDayMutationBody {
  attendanceId: number;
  wordOfTheDay: string;
}

interface StudentSubmitWordOfTheDayMutationResponse {
  detail: string;
}

/**
 * Hook to submit the word of the day for students.
 *
 * Invalidates any existing query for the word of the day.
 */
export const useStudentSubmitWordOfTheDayMutation = (
  sectionId: number
): UseMutationResult<void, StudentSubmitWordOfTheDayMutationResponse, StudentSubmitWordOfTheDayMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<
    void,
    StudentSubmitWordOfTheDayMutationResponse,
    StudentSubmitWordOfTheDayMutationBody
  >(
    async (body: StudentSubmitWordOfTheDayMutationBody) => {
      if (isNaN(sectionId)) {
        throw new PermissionError("Invalid section id");
      }
      const response = await fetchWithMethod(`sections/${sectionId}/wotd`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return;
      } else {
        throw await response.json();
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["wordoftheday", sectionId]);
      }
    }
  );

  // handle error in component
  return mutationResult;
};

export interface SectionSwapMutationBody {
  email: string;
}

/**
 * Hook to request a swap with another student
 */
export const useSwapRequestMutation = (
  sectionId: number
): UseMutationResult<Section, ServerError, SectionSwapMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<Section, Error, SectionSwapMutationBody>(
    async (body: SectionSwapMutationBody) => {
      const response = await fetchWithMethod(`sections/${sectionId}/swap`, HTTP_METHODS.POST, body);
      if (response.ok) {
        return response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to request swap`);
      }
    },
    {
      retry: handleRetry,
      onSuccess: () => {
        queryClient.invalidateQueries(["section_swap", sectionId]);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

export const useSwapRequestQuery = (
  sectionId: number
): UseMutationResult<Section, ServerError, SectionSwapMutationBody> => {
  const queryClient = useQueryClient();
  const queryResult = useMutation<Section, Error, SectionSwapMutationBody>(
    async (body: SectionSwapMutationBody) => {
      const response = await fetchWithMethod(`sections/<section_id:int>/swap`, HTTP_METHODS.GET, body);
      if (response.ok) {
        return response.json();
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to load swap`);
      }
    },
    {
      retry: handleRetry,
      onSuccess: () => {
        queryClient.invalidateQueries(["section_swap", sectionId]);
      }
    }
  );

  handleError(queryResult);
  return queryResult;
};

export interface StudentDropMutationBody {
  banned: boolean;
  blacklisted: boolean;
}

/**
 * Hook to drop a student from their section.
 *
 * Invalidates all queries associated with the section.
 */
export const useDropStudentMutation = (
  studentId: number,
  sectionId: number
): UseMutationResult<void, ServerError, StudentDropMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, StudentDropMutationBody>(
    async (body: StudentDropMutationBody) => {
      if (isNaN(studentId) || isNaN(sectionId)) {
        throw new PermissionError("Invalid section id");
      }
      const response = await fetchWithMethod(`students/${studentId}/drop`, HTTP_METHODS.PATCH, body);
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
 * Hook to drop the current user from their section.
 *
 * Invalidates the current user profile query.
 */
export const useDropUserMutation = (studentId: number) => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, void>(
    async () => {
      const response = await fetchWithMethod(`students/${studentId}/drop`, HTTP_METHODS.PATCH);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to drop student ${studentId} from section`);
      }
    },
    {
      onSuccess: () => {
        // invalidate profiles query
        queryClient.invalidateQueries(["profiles"]);
        // no need to invalidate section queries
      },
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

export interface EnrollUserMutationResponse {
  detail: string;
}

/**
 * Enroll the current user into a given section.
 *
 * On success, returns nothing; on failure, returns the response body.
 *
 * Invalidates all queries associated with the section,
 * along with the current user profile query.
 */
export const useEnrollUserMutation = (sectionId: number): UseMutationResult<void, EnrollUserMutationResponse, void> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, EnrollUserMutationResponse, void>(
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

interface EnrollStudentMutationRequest {
  emails: Array<{ [email: string]: string }>;
  actions: {
    [action: string]: string;
  };
}

interface EnrollStudentMutationResponse {
  status: number;
  json: {
    errors?: {
      critical?: string;
      capacity?: string;
    };
    progress?: Array<{
      email: string;
      status: string;
      detail?: any;
    }>;
  };
}

/**
 * Enroll a list of students into a given section.
 *
 * On success, returns nothing; on failure, returns the response body.
 * Failure response body contains the JSON response along with the response status.
 *
 * Invalidates all queries associated with the section.
 */
export const useEnrollStudentMutation = (
  sectionId: number
): UseMutationResult<void, EnrollStudentMutationResponse, EnrollStudentMutationRequest> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, EnrollStudentMutationResponse, EnrollStudentMutationRequest>(
    async (body: EnrollStudentMutationRequest) => {
      const response = await fetchWithMethod(`sections/${sectionId}/students`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return;
      } else {
        throw { status: response.status, json: await response.json() };
      }
    },
    {
      onSuccess: () => {
        // invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId]);
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
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to create section`);
      }
    },
    { retry: handleRetry }
  );

  handleError(mutationResult);
  return mutationResult;
};

export interface SectionUpdateMutationBody {
  capacity: number;
  description: string;
}

/**
 * Hook to modify a section
 */
export const useSectionUpdateMutation = (
  sectionId: number
): UseMutationResult<void, ServerError, SectionUpdateMutationBody> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, SectionUpdateMutationBody>(
    async (body: SectionUpdateMutationBody) => {
      const response = await fetchWithMethod(`/sections/${sectionId}/`, HTTP_METHODS.PATCH, body);
      if (response.ok) {
        return;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(`Failed to create section`);
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
