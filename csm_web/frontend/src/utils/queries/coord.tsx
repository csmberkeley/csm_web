import { fetchNormalized } from "../api";
import { handlePermissionsError, PermissionError, ServerError } from "./helpers";

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
