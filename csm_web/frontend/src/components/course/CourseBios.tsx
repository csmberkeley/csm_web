import React from "react";

import { DayGroup } from "../../utils/queries/courses";
import { RawUserInfo, Section, Spacetime } from "../../utils/types";
import BioEntry from "./BioEntry";

interface CourseBiosProps {
  sectionsByDay: DayGroup[];
}

interface UserWithSectionTimes {
  user: RawUserInfo;
  sectionTimes: Spacetime[][];
}

const CourseBios = ({ sectionsByDay }: CourseBiosProps) => {
  const flattenedSections = sectionsByDay.reduce((acc, curr) => acc.concat(curr.sections), [] as Section[]);
  const users: Record<number, UserWithSectionTimes> = {};
  const userOrder: number[] = [];

  flattenedSections.forEach(section => {
    const userId = section.mentor.user.id;
    if (userOrder.includes(userId)) {
      users[userId].sectionTimes.push(section.spacetimes);
    } else {
      users[userId] = {
        user: section.mentor.user,
        sectionTimes: [section.spacetimes]
      };
      userOrder.push(userId);
    }
  });

  return (
    <div className="bios">
      {userOrder.map(userId => (
        <BioEntry key={userId} {...users[userId]} />
      ))}
      ;
    </div>
  );
};

export default CourseBios;
