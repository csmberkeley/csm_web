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
  const [sortedSlots, setSortedSlots] = useState<Slot[]>(slots);
  const [assignmentBySlot, setAssignmentBySlot] = useState<Map<number, number[]>>(new Map());

  /* Fetch mentor data */
  useEffect(() => {
    fetchJSON(`/matcher/${profile.courseId}/mentors`).then((data: any) => {
      setMentorsById(new Map(data.mentors.map((mentor: any) => [mentor.id, mentor])));
    });
  }, []);

  /* Sort slots */
  useEffect(() => {
    setSortedSlots(
      slots.sort((a, b) => Math.min(...a.times.map(t => t.startTime)) - Math.min(...b.times.map(t => t.startTime)))
    );
  }, [slots]);

  /* Organize assignments by slot */
  useEffect(() => {
    const newAssignmentBySlot = new Map<number, number[]>();
    assignments.forEach((assignment: Assignment) => {
      const slot_id = assignment.slot;
      const mentor_id = assignment.mentor;
      if (!newAssignmentBySlot.has(slot_id)) {
        newAssignmentBySlot.set(slot_id, []);
      }
      newAssignmentBySlot.get(slot_id)!.push(mentor_id);
    });
    setAssignmentBySlot(newAssignmentBySlot);
  }, [assignments]);

  return (
    <div>
      {sortedSlots.map((slot, idx) => (
        <div className="matcher-assignment-slot" key={`slot-${idx}`}>
          <div className="matcher-assignment-slot-head">
            {slot.times.map((time, timeidx) => (
              <React.Fragment key={`slot-time-${timeidx}`}>
                <div className="matcher-assignment-time">
                  {time.day} {formatTime(time.startTime)}&#8211;{formatTime(time.endTime)}
                </div>
                {timeidx < slot.times.length - 1 && <div className="matcher-assignment-time-divider">/</div>}
              </React.Fragment>
            ))}
          </div>
          <div className="matcher-assignment-slot-body">
            {assignmentBySlot.get(slot.id!)?.map((mentor_id, idx) => (
              <div className="matcher-assignment-mentor" key={`slot-${idx}-mentor-${mentor_id}`}>
                <div className="matcher-assignment-mentor-name">{mentorsById.get(mentor_id)?.name}</div>
                <div className="matcher-assignment-mentor-email">{mentorsById.get(mentor_id)?.email}</div>
              </div>
            ))}
          </div>
          <br />
        </div>
      ))}
    </div>
  );
};
