import React, { useMemo, useState } from "react";
import { fetchJSON } from "../../utils/api";
import { useCourses, useProfiles } from "../../utils/queries/base";
import { getRoles, Roles } from "../../utils/user";
import LoadingSpinner from "../LoadingSpinner";
import ResourceTable from "./ResourceTable";
import { Resource } from "./ResourceTypes";

export const Resources = (): React.ReactElement => {
  const [selectedCourseID, setSelectedCourseID] = useState<number>(1);
  const [cache, setCache] = useState<Map<number, any>>(new Map());

  const { data: profiles, isSuccess: profilesLoaded } = useProfiles();
  const { data: courses, isSuccess: coursesLoaded } = useCourses();

  /**
   * Organize profiles into roles upon load.
   */
  const roles = useMemo<Roles>(() => {
    if (profilesLoaded) {
      return getRoles(profiles);
    }
    // not done loading yet
    return undefined as never;
  }, [profiles]);

  // display loading spinner if anything is loading
  if (!profilesLoaded || !coursesLoaded || roles === undefined) {
    return (
      <div className="spinner-div">
        <LoadingSpinner />
      </div>
    );
  }

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
