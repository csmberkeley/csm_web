import { Profile, Role } from "./types";

export interface Roles {
  [Role.STUDENT]: Set<number>;
  [Role.MENTOR]: Set<number>;
  [Role.COORDINATOR]: Set<number>;
  [Role.WAITLIST]: Set<number>;
}

/**
 * Creates an empty Roles object.
 *
 * @returns an empty Roles object
 */
export function emptyRoles(): Roles {
  return {
    [Role.STUDENT]: new Set(),
    [Role.MENTOR]: new Set(),
    [Role.COORDINATOR]: new Set(),
    [Role.WAITLIST]: new Set()
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
    roles[course.role].add(course.courseId);
  });
  return roles;
}
