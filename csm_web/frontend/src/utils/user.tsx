import { Profile } from "./types";

export interface Roles {
  STUDENT: Set<number>;
  MENTOR: Set<number>;
  COORDINATOR: Set<number>;
}

/**
 * Creates an empty Roles object.
 *
 * @returns an empty Roles object
 */
export function emptyRoles(): Roles {
  return {
    STUDENT: new Set(),
    MENTOR: new Set(),
    COORDINATOR: new Set()
  };
}

/**
 * Retrieves all user roles and groups them by role type for easier access.
 *
 * @returns all user roles split by role type
 */
export function getRoles(profiles: Profile[]): Roles {
  const roles = emptyRoles();
  profiles.map(course => {
    roles[course.role as keyof Roles].add(course.courseId);
  });
  return roles;
}
