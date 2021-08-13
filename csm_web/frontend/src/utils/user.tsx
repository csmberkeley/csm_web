import { fetchJSON } from "./api";
import { cloneDeep } from "lodash";

const DEFAULT_ROLES = {
  STUDENT: new Set(),
  MENTOR: new Set(),
  COORDINATOR: new Set()
};

export function getRoles() {
  // TODO: determine what type to return
  const roles = cloneDeep(DEFAULT_ROLES);

  fetchJSON("/profiles").then(profiles => {
    profiles.map(course => {
      roles[course.role].add(course.course);
    });
  });

  return roles;
}
