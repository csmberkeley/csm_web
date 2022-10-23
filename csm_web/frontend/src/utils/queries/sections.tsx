/**
 * Query hooks regarding sections.
 */

import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { fetchNormalized, fetchWithMethod, HTTP_METHODS } from "../api";
import { Attendance, RawAttendance, Section, Spacetime, Student } from "../types";
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
 *
 * List of students is sorted by name.
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

export const useStudentAttendances = (studentId: number): UseQueryResult<Attendance[], ServerError> => {
  const queryResult = useQuery<Attendance[], Error>(["students", studentId, "attendance"], async () => {
    const response = await fetchNormalized(`/students/${studentId}/attendances`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new ServerError(`Failed to fetch student ${studentId} attendances`);
    }
  });

  handleError(queryResult);
  return queryResult;
};

/* ===== Mutations ===== */

export interface UpdateStudentAttendanceBody {
  id: number;
  presence: string;
}
export interface UpdateStudentAttendancesMutationParams {
  studentId: number;
  body: UpdateStudentAttendanceBody;
}

export const useUpdateStudentAttendancesMutation = (
  sectionId: number
): UseMutationResult<void, ServerError, UpdateStudentAttendancesMutationParams> => {
  const queryClient = useQueryClient();
  const mutationResult = useMutation<void, Error, UpdateStudentAttendancesMutationParams>(
    async ({ studentId, body }: UpdateStudentAttendancesMutationParams) => {
      const response = await fetchWithMethod(`students/${studentId}/attendances/`, HTTP_METHODS.PUT, body);
      if (response.ok) {
        return;
      } else {
        throw new ServerError(`Failed to save attendance ${body.id} for student ${studentId}`);
      }
    },
    {
      onSuccess: () => {
        //invalidate all queries for the section
        queryClient.invalidateQueries(["sections", sectionId, "attendance"]);
      }
    }
  );
  handleError(mutationResult);
  return mutationResult;
};

export interface StudentDropMutationBody {
  banned: boolean;
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
        throw new ServerError(`Failed to drop student ${studentId} from section`);
      }
    },
    {
      onSuccess: () => {
        // invalidate profiles query
        queryClient.invalidateQueries(["profiles"]);
        // no need to invalidate section queries
      }
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
        throw new ServerError(`Failed to create section`);
      }
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
