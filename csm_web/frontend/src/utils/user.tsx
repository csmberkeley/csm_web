import { fetchJSON } from "./api";
import { cloneDeep } from "lodash";

const DEFAULT_ROLES = {
  STUDENT: new Set(),
  MENTOR: new Set(),
  COORDINATOR: new Set()
};

interface Roles {
  STUDENT: Set<number>;
  MENTOR: Set<number>;
  COORDINATOR: Set<number>;
}

export function getRoles(): Promise<Roles>{
  return fetchJSON("/profiles").then(profiles => {
    const roles = cloneDeep(DEFAULT_ROLES);
    profiles.map(course => {
      roles[course.role].add(course.courseId);
    });
    return roles;
  });
}
