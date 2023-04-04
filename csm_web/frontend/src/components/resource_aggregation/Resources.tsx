import React, { useMemo, useState } from "react";
import { useProfiles } from "../../utils/queries/base";
import { useCourses } from "../../utils/queries/courses";
import { getRoles, Roles } from "../../utils/user";
import LoadingSpinner from "../LoadingSpinner";
import ResourceTable from "./ResourceTable";

export const Resources = (): React.ReactElement => {
  const [selectedCourseID, setSelectedCourseID] = useState<number>(1);

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

  return (
    <div className="outer">
      <div className="tabs">
        <div className="tab-list">
          {courses
            .filter(course => !course.isRestricted)
            .map(course => (
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
      <ResourceTable courseID={selectedCourseID} roles={roles} />
    </div>
  );
};

export default Resources;
