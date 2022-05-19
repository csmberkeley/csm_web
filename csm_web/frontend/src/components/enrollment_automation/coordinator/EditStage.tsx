import React, { useEffect, useState } from "react";
import { fetchJSON } from "../../../utils/api";
import { Mentor, Profile } from "../../../utils/types";
import { formatTime } from "../utils";
import { Assignment, Slot } from "../EnrollmentAutomationTypes";

interface EditStageProps {
  profile: Profile;
  slots: Slot[];
  assignments: Assignment[];
  refreshStage: () => void;
}

export const EditStage = ({ profile, slots, assignments, refreshStage }: EditStageProps) => {
  const [mentorsById, setMentorsById] = useState<Map<number, Mentor>>(new Map());

  useEffect(() => {
    fetchJSON(`/matcher/${profile.courseId}/mentors`).then((data: any) => {
      setMentorsById(new Map(data.mentors.map((mentor: any) => [mentor.id, mentor])));
    });
  }, []);

  console.log(slots);

  const sortedSlots = slots.sort(
    (a, b) => Math.min(...a.times.map(t => t.startTime)) - Math.min(...b.times.map(t => t.startTime))
  );
  const assignment_by_slot = new Map<number, number[]>();
  assignments.forEach((assignment: Assignment) => {
    const slot_id = assignment.slot;
    const mentor_id = assignment.mentor;
    if (!assignment_by_slot.has(slot_id)) {
      assignment_by_slot.set(slot_id, []);
    }
    assignment_by_slot.get(slot_id)!.push(mentor_id);
  });

  console.log(assignment_by_slot);
  console.log(sortedSlots);
  console.log(assignment_by_slot.get(sortedSlots[0].id!));
  console.log(mentorsById);

  return (
    <div>
      {sortedSlots.map((slot, idx) => (
        <div className="matcher-assignment-slot" key={`slot-${idx}`}>
          <div className="matcher-assignment-slot-head">
            {slot.times.map((time, timeidx) => (
              <div key={`slot-time-${timeidx}`}>
                <span>{time.day}</span>
                <span>{formatTime(time.startTime)}</span>&#8211;<span>{formatTime(time.endTime)}</span>
              </div>
            ))}
          </div>
          {assignment_by_slot.get(slot.id!)?.map((mentor_id, idx) => (
            <div className="matcher-assignment-mentor" key={`slot-${idx}-mentor-${mentor_id}`}>
              Name: <span>{mentorsById.get(mentor_id)?.name}</span>
              <br />
              Email: <span>{mentorsById.get(mentor_id)?.email}</span>
            </div>
          ))}
          <br />
        </div>
      ))}
    </div>
  );
};
