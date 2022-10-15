import React, { useState, useEffect } from "react";
import { fetchJSON } from "../../utils/api";
import { Course } from "../../utils/types";
import { emptyRoles, getRoles, Roles } from "../../utils/user";
import ResourceTable from "./ResourceTable";
import { Resource } from "./ResourceTypes";

export const Resources = (): React.ReactElement => {
  const [roles, setRoles] = useState<Roles>(emptyRoles());
  const [selectedCourseID, setSelectedCourseID] = useState<number>(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [cache, setCache] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    getRoles().then(roles => {
      setRoles(roles);
      // initialize with the first course in order
      const associatedCourses = [...roles.COORDINATOR, ...roles.MENTOR, ...roles.STUDENT].sort();
      if (associatedCourses.length > 0) {
        setSelectedCourseID(associatedCourses[0]);
      }
    });
    fetchJSON("courses").then(data => {
      setCourses(data);
    });
  }, []);

  function handleTabClick(courseID: number) {
    setSelectedCourseID(courseID);
  }

  /**
   * Retrieves resources from cache, populating the cache if cache miss.
   *
   * @param courseID id of course to get resources for
   * @returns promise for asynchronous data fetch
   */
  function getResources(courseID: number): Promise<Array<Resource>> {
    if (cache.has(courseID)) {
      // still create promise for cache retrieve
      return new Promise(resolve => {
        resolve(cache.get(courseID));
      });
    } else {
      // get data and store in cache
      return updateResources(courseID);
    }
  }

  /**
   * Fetches resources from API, replacing the cache entry if it already exists.
   *
   * @param courseID id of course to update resources for
   * @returns promise for asynchronous data fetch
   */
  function updateResources(courseID: number): Promise<Array<Resource>> {
    return fetchJSON(`/resources/${courseID}/resources`).then(data => {
      const updatedCache = new Map(cache);
      updatedCache.set(courseID, data);
      setCache(updatedCache);
      return data;
    });
  }

  return (
    <div className="outer">
      <div className="tabs">
        <div className="tab-list">
          {courses.map(course => (
            <button
              onClick={() => handleTabClick(course.id)}
              key={course.id}
              className={course.id === selectedCourseID ? "active tab" : "tab"}
            >
              {course.name}
            </button>
          ))}
        </div>
      </div>
      <ResourceTable
        courseID={selectedCourseID}
        roles={roles}
        getResources={() => getResources(selectedCourseID)}
        updateResources={() => updateResources(selectedCourseID)}
      />
    </div>
  );
};

export default Resources;
