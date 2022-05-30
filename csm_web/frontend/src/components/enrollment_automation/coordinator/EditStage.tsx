import React, { useEffect, useRef, useState } from "react";
import { fetchJSON } from "../../../utils/api";
import { Mentor, Profile } from "../../../utils/types";
import { formatTime } from "../utils";
import { Assignment, Slot } from "../EnrollmentAutomationTypes";
import { DAYS } from "../calendar/CalendarTypes";

import MenuBurger from "../../../../static/frontend/img/menu-burger.svg";

interface EditStageProps {
  profile: Profile;
  slots: Slot[];
  assignments: Assignment[];
  refreshStage: () => void;
}

export const EditStage = ({ profile, slots, assignments, refreshStage }: EditStageProps): React.ReactElement => {
  const [mentorsById, setMentorsById] = useState<Map<number, Mentor>>(new Map());
  const [sortedSlots, setSortedSlots] = useState<Slot[]>(slots);
  const [assignmentBySlot, setAssignmentBySlot] = useState<Map<number, number[]>>(new Map());

  // mentor dragging
  const [draggingSlot, setDraggingSlot] = useState<Slot | null>(null);
  const [draggingMentor, setDraggingMentor] = useState<number>(-1);

  const hoverDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // fetch mentor data
    fetchJSON(`/matcher/${profile.courseId}/mentors`).then((data: any) => {
      setMentorsById(new Map(data.mentors.map((mentor: any) => [mentor.id, mentor])));
    });

    // add listener for resetting drag
    if (hoverDiv.current) {
      const wrapper = () => handleDragEnd(null);
      window.addEventListener("mouseup", wrapper);
      // remove listener on unmount
      return () => {
        window.removeEventListener("mouseup", wrapper);
      };
    }
  }, []);

  /* Sort slots by earliest day and then by earliest start time */
  useEffect(() => {
    setSortedSlots(
      Array.from(slots).sort((a, b) => {
        const aDays = a.times.map(t => DAYS.indexOf(t.day));
        const bDays = b.times.map(t => DAYS.indexOf(t.day));
        if (Math.min(...aDays) != Math.min(...bDays)) {
          return Math.min(...aDays) - Math.min(...bDays);
        } else {
          const aTimes = a.times.map(t => t.startTime);
          const bTimes = b.times.map(t => t.startTime);
          return Math.min(...aTimes) - Math.min(...bTimes);
        }
      })
    );
  }, [slots]);

  /* Organize assignments by slot */
  useEffect(() => {
    const newAssignmentBySlot = new Map<number, number[]>();
    const assignedMentors = new Set<number>();
    // add all assignments to map
    assignments.forEach((assignment: Assignment) => {
      const slot_id = assignment.slot;
      const mentor_id = assignment.mentor;
      if (!newAssignmentBySlot.has(slot_id)) {
        newAssignmentBySlot.set(slot_id, []);
      }
      newAssignmentBySlot.get(slot_id)!.push(mentor_id);
      assignedMentors.add(mentor_id);
    });
    // add all unassigned mentors to map
    const unassignedMentors = Array.from(mentorsById.keys()).filter(id => !assignedMentors.has(id));
    newAssignmentBySlot.set(-1, unassignedMentors);
    setAssignmentBySlot(newAssignmentBySlot);
    console.log({ assignedMentors, unassignedMentors, mentors: Array.from(mentorsById.keys()) });
  }, [assignments, mentorsById]); // update when assignments change, or when mentors are fetched

  console.log({ assignments, mentorsById, assignmentBySlot });

  /* Dragging functionality */

  /**past_objects_included
   * Handle the start of a drag
   */
  const handleDragStart = (slot: Slot, mentor_id: number) => {
    setDraggingMentor(mentor_id);
    setDraggingSlot(slot);
  };

  /**
   * Handle the end of a drag, resetting the drag state;
   * modifies the assignment to reflect drag changes
   */
  const handleDragEnd = (slot: Slot | null) => {
    if (slot != null && draggingMentor != -1 && draggingSlot != null && slot.id != draggingSlot.id) {
      const slot_id = slot.id!;
      const newAssignmentBySlot = new Map<number, number[]>(assignmentBySlot);
      // remove mentor from old slot
      const oldSlotAssignment = newAssignmentBySlot.get(draggingSlot.id!)!;
      newAssignmentBySlot.set(
        draggingSlot.id!,
        oldSlotAssignment.filter(mentor_id => mentor_id != draggingMentor)
      );
      // add mentor to new slot
      if (newAssignmentBySlot.has(slot_id)) {
        newAssignmentBySlot.set(slot_id, [...newAssignmentBySlot.get(slot_id)!, draggingMentor]);
      } else {
        newAssignmentBySlot.set(slot_id!, [draggingMentor]);
      }
      // update assignment
      setAssignmentBySlot(newAssignmentBySlot);
    }

    setDraggingMentor(-1);
    setDraggingSlot(null);
  };

  return (
    <div ref={hoverDiv}>
      <AssignmentGroup
        mentorsById={mentorsById}
        assignedMentors={assignmentBySlot.get(-1) || []}
        slot={{ id: -1, times: [] }}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        draggingMentor={draggingMentor}
      />
      {sortedSlots.map((slot, idx) => (
        <AssignmentGroup
          key={`slot-${idx}`}
          mentorsById={mentorsById}
          assignedMentors={assignmentBySlot.get(slot.id!) || []}
          slot={slot}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          draggingMentor={draggingMentor}
        />
      ))}
    </div>
  );
};

interface AssignmentGroupProps {
  mentorsById: Map<number, Mentor>;
  assignedMentors: number[];
  slot: Slot;
  draggingMentor: number;
  onMouseDown: (slot: Slot, mentor_id: number) => void;
  onMouseUp: (slot: Slot) => void;
}

const AssignmentGroup = ({
  mentorsById,
  assignedMentors,
  slot,
  draggingMentor,
  onMouseDown,
  onMouseUp
}: AssignmentGroupProps): React.ReactElement => {
  const outerDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (draggingMentor != null) {
      outerDiv.current?.classList.remove("matcher-assignment-group-hover");
    }
  }, [draggingMentor]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, mentor_id: number) => {
    if (e.button == 0) {
      e.preventDefault();
      onMouseDown(slot, mentor_id);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, slot: Slot) => {
    e.stopPropagation();
    onMouseUp(slot);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (draggingMentor != -1) {
      outerDiv.current?.classList.add("matcher-assignment-group-hover");
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (draggingMentor != -1) {
      outerDiv.current?.classList.remove("matcher-assignment-group-hover");
    }
  };

  return (
    <div
      ref={outerDiv}
      className="matcher-assignment-slot"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseUp={e => handleMouseUp(e, slot)}
    >
      {slot.times.length > 0 ? (
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
      ) : (
        <div className="matcher-assignment-slot-head-empty">
          <div className="matcher-assignment-time-empty">Unassigned</div>
        </div>
      )}
      <div className="matcher-assignment-slot-body">
        {assignedMentors.length > 0 ? (
          assignedMentors.map((mentor_id, idx) => (
            <div
              className={
                "matcher-assignment-mentor" + (mentor_id == draggingMentor ? " matcher-assignment-mentor-dragging" : "")
              }
              key={`mentor-${idx}`}
            >
              <div onMouseDown={e => handleMouseDown(e, mentor_id)}>
                <MenuBurger className="matcher-assignment-burger" />
              </div>
              <div className="matcher-assignment-mentor-name">{mentorsById.get(mentor_id)?.name}</div>
              <div className="matcher-assignment-mentor-email">{mentorsById.get(mentor_id)?.email}</div>
            </div>
          ))
        ) : (
          <div className="matcher-assignment-mentor-empty">None</div>
        )}
      </div>
    </div>
  );
};
