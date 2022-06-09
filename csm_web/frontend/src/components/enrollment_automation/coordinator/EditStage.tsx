import React, { useEffect, useRef, useState } from "react";
import { fetchJSON, fetchWithMethod } from "../../../utils/api";
import { Mentor, Profile } from "../../../utils/types";
import { formatTime } from "../utils";
import { Assignment, Slot, Time, SlotPreference } from "../EnrollmentAutomationTypes";
import { DAYS, DAYS_ABBREV } from "../calendar/CalendarTypes";

import Pencil from "../../../../static/frontend/img/pencil.svg";
import InfoIcon from "../../../../static/frontend/img/info.svg";

interface EditTableRow {
  mentorId: number; // need mentor id for identification
  slotId: number; // need slot id for identification
  name: string;
  email: string;
  times: Time[];
  capacity: number;
  description: string;
}

/**
 * Map of custom sort functions for table columns.
 * If not specified, defaults to the `<` and `>` operators.
 */
const SORT_FUNCTIONS: Record<string, (a: any, b: any) => number> = {
  times: (a: Time[], b: Time[]): number => {
    const aDays = a.map(t => DAYS.indexOf(t.day));
    const bDays = b.map(t => DAYS.indexOf(t.day));
    if (Math.min(...aDays) != Math.min(...bDays)) {
      return Math.min(...aDays) - Math.min(...bDays);
    } else {
      const aTimes = a.map(t => t.startTime);
      const bTimes = b.map(t => t.startTime);
      return Math.min(...aTimes) - Math.min(...bTimes);
    }
  }
};

interface EditStageProps {
  profile: Profile;
  slots: Slot[];
  assignments: Assignment[];
  prefByMentor: Map<number, SlotPreference[]>;
  refreshStage: () => void;
  refreshAssignments: () => void;
}

export const EditStage = ({
  profile,
  slots,
  assignments,
  prefByMentor,
  refreshStage,
  refreshAssignments
}: EditStageProps): React.ReactElement => {
  /**
   * Table of mentor information and section metadata for editing.
   */
  const [editTable, setEditTable] = useState<EditTableRow[]>([]);
  /**
   * Attribute to sort the table by,
   * specified in the form `{attr: key, dir: -1 | 1}`.
   *
   * -1 means descending, 1 means ascending.
   *
   * By default, sorts by time in descending order.
   */
  const [tableSortBy, setTableSortBy] = useState<{ attr: keyof EditTableRow; dir: -1 | 1 }>({ attr: "times", dir: 1 });

  /**
   * Map from mentor ids to the respective mentor objects.
   * Fetched on mount; contains all mentors in the system
   * to be matched for the course.
   */
  const [mentorsById, setMentorsById] = useState<Map<number, Mentor>>(new Map());
  /**
   * Map from slot ids to the respective slot objects.
   * Fetched on mount; contains all slots in the system
   * to be matched for the course.
   */
  const [slotsById, setSlotsById] = useState<Map<number, Slot>>(new Map());
  /**
   * List of all slots, sorted by day, and then by start time.
   */
  const [sortedSlots, setSortedSlots] = useState<Slot[]>(slots);

  /**
   * Set of all selected mentor ids.
   */
  const [selectedMentors, setSelectedMentors] = useState<Set<number>>(new Set());

  /**
   * State of the header checkbox;
   * 0 = unchecked, 1 = checked, 2 = indeterminate.
   *
   * We have to add this state, since React doesn't rerender
   * if we update the ref directly.
   */
  const [headerCheckboxState, setHeaderCheckboxState] = useState<number>(0);
  /**
   * Reference to the header checkbox element;
   * used to set indeterminate state.
   */
  const headerCheckbox = useRef<HTMLInputElement>(null);

  /* Fetch mentor data */
  useEffect(() => {
    fetchJSON(`/matcher/${profile.courseId}/mentors`).then((data: any) => {
      const newMentorsById = new Map<number, Mentor>();
      data.mentors.forEach((mentor: Mentor) => {
        newMentorsById.set(mentor.id, mentor);
      });
      setMentorsById(newMentorsById);
    });
  }, []);

  /* Sort slots by earliest day and then by earliest start time */
  useEffect(() => {
    setSortedSlots(Array.from(slots).sort((a, b) => SORT_FUNCTIONS["times"](a.times, b.times)));
    setSlotsById(
      new Map(
        slots.map((slot: Slot) => {
          return [slot.id!, slot];
        })
      )
    );
  }, [slots]);

  /* Organize assignments by slot */
  useEffect(() => {
    const newEditTable: EditTableRow[] = [];
    assignments.forEach((assignment: Assignment) => {
      const mentor = mentorsById.get(assignment.mentor);
      if (mentor == null) {
        return;
      }
      const section = assignment.section;
      // default to empty list if no matched slot (i.e. unassigned)
      const times = slotsById.get(assignment.slot)?.times || [];
      const capacity = section.capacity;
      const description = section.description;
      newEditTable.push({
        mentorId: assignment.mentor,
        slotId: assignment.slot,
        name: mentor.name,
        email: mentor.email,
        times,
        capacity,
        description
      });
    });
    setEditTable(newEditTable);
    sortTable();
  }, [assignments, mentorsById]); // update when assignments change, or when mentors are fetched

  /**
   * Sort the table by the current sort attribute.
   */
  const sortTable = () => {
    setEditTable((oldEditTable: EditTableRow[]) =>
      Array.from(oldEditTable).sort((a, b) => {
        const aVal = a[tableSortBy.attr];
        const bVal = b[tableSortBy.attr];

        // prefer custom sort function if specified
        if (Object.keys(SORT_FUNCTIONS).includes(tableSortBy.attr)) {
          // typescript coercing to key of SORT_FUNCTIONS
          const customSortAttr = tableSortBy.attr as keyof typeof SORT_FUNCTIONS;
          return SORT_FUNCTIONS[customSortAttr](aVal, bVal) * tableSortBy.dir;
        } else {
          if (aVal > bVal) {
            return tableSortBy.dir;
          } else if (aVal < bVal) {
            return -tableSortBy.dir;
          } else {
            return 0;
          }
        }
      })
    );
  };

  /* Sort table on update */
  useEffect(sortTable, [tableSortBy]);

  /**
   * Event handler when a row of the table is changed.
   */
  const handleChangeRow = (mentorId: number, attr: keyof EditTableRow, value: any) => {
    const newEditTable = [...editTable];
    const rowIdx = newEditTable.findIndex(row => row.mentorId === mentorId);
    const selectedRowIndices = new Set(
      // filter for selected rows, and convert them to indices
      newEditTable.map((row, idx) => (selectedMentors.has(row.mentorId) ? idx : -1)).filter(idx => idx != -1)
    );

    if (rowIdx != -1) {
      const row: EditTableRow = { ...newEditTable[rowIdx] };
      if (attr === "capacity") {
        const newCapacity = parseInt(value);
        if (isNaN(newCapacity)) {
          return;
        }
        row[attr] = newCapacity;

        // if the row is selected, update all selected rows
        if (selectedRowIndices.has(rowIdx)) {
          selectedRowIndices.forEach(idx => {
            if (idx != rowIdx) {
              const newRow = { ...newEditTable[idx] };
              newRow[attr] = newCapacity;
              newEditTable[idx] = newRow;
            }
          });
        }
      } else if (attr === "description") {
        row[attr] = value;

        // if the row is selected, update all selected rows
        if (selectedRowIndices.has(rowIdx)) {
          selectedRowIndices.forEach(idx => {
            if (idx != rowIdx) {
              const newRow = { ...newEditTable[idx] };
              newRow[attr] = value;
              newEditTable[idx] = newRow;
            }
          });
        }
      } else if (attr === "times") {
        // find the corresponding slot and update
        const slotId = parseInt(value);
        if (isNaN(slotId)) {
          return;
        }
        const slot = slotsById.get(slotId);
        if (slot == null) {
          return;
        }
        row.slotId = slotId;
        row[attr] = slot.times;
      } else {
        // should not get here
        console.error(`Unknown attribute ${attr}`);
      }

      // update row
      newEditTable[rowIdx] = row;
      setEditTable(newEditTable);
    }
  };

  /**
   * Update the header checkbox based on the set of selected rows.
   * Unchecked when none selected, checked when all selected,
   * and indeterminate when some selected.
   */
  const updateHeaderCheckbox = (selected: Set<number>) => {
    if (headerCheckbox.current != null) {
      let newState = 0;
      if (selected.size == 0) {
        newState = 0;
        headerCheckbox.current.indeterminate = false;
      } else if (selected.size == mentorsById.size) {
        newState = 1;
        headerCheckbox.current.indeterminate = false;
      } else {
        newState = 2;
        headerCheckbox.current.indeterminate = true;
      }
      setHeaderCheckboxState(newState);
    }
  };

  /**
   * Event handler when a row of the table is selected.
   * Updates selected mentors and the header checkbox.
   */
  const handleSelect = (mentorId: number) => {
    const newSelectedMentors = new Set(selectedMentors);
    if (newSelectedMentors.has(mentorId)) {
      newSelectedMentors.delete(mentorId);
    } else {
      newSelectedMentors.add(mentorId);
    }
    updateHeaderCheckbox(newSelectedMentors);
    setSelectedMentors(newSelectedMentors);
  };

  /**
   * Event handler when the header checkbox is clicked.
   */
  const handleHeaderSelect = () => {
    let newSelected: Set<number>;
    if (selectedMentors.size == mentorsById.size) {
      newSelected = new Set();
    } else {
      newSelected = new Set(mentorsById.keys());
    }
    updateHeaderCheckbox(newSelected);
    setSelectedMentors(newSelected);
  };

  /**
   * Send a PUT request to update the saved assignments in the database.
   */
  const saveAssignment = () => {
    const newAssignments: Assignment[] = [];
    editTable.forEach(row => {
      newAssignments.push({
        mentor: row.mentorId,
        slot: row.slotId,
        section: {
          capacity: row.capacity,
          description: row.description
        }
      });
    });

    fetchWithMethod(`/matcher/${profile.courseId}/assignment`, "PUT", {
      assignment: newAssignments
    }).then(() => {
      refreshAssignments();
    });
  };

  return (
    <div>
      <div>
        <div className="matcher-assignment-mentor-head">
          <label className="matcher-assignment-mentor-select">
            <input
              ref={headerCheckbox}
              checked={headerCheckboxState == 1}
              type="checkbox"
              onChange={handleHeaderSelect}
            />
          </label>
          <div className="matcher-assignment-mentor-info">Mentor</div>
          <div className="matcher-assignment-section-times">Times</div>
          <div className="matcher-assignment-section-capacity">Capacity</div>
          <div className="matcher-assignment-section-description">Description</div>
        </div>
        {editTable.map((row: EditTableRow) => (
          <EditTableRow
            key={row.mentorId}
            row={row}
            sortedSlots={sortedSlots}
            prefByMentor={prefByMentor}
            onChangeRow={handleChangeRow}
            isSelected={selectedMentors.has(row.mentorId)}
            onSelect={handleSelect}
          />
        ))}
      </div>
      <div className="matcher-assignment-footer">
        <div className="matcher-assignment-footer-help">
          {selectedMentors.size > 1 && (
            <React.Fragment>
              <InfoIcon className="icon matcher-assignment-footer-help-icon" />
              <span className="matcher-assignment-footer-help-text">Modify any input to bulk edit selected rows.</span>
            </React.Fragment>
          )}
        </div>
        <button className="matcher-assignment-save-button" onClick={() => saveAssignment()}>
          Save
        </button>
      </div>
    </div>
  );
};

interface EditTableRowProps {
  /**
   * Row of the table to render
   */
  row: EditTableRow;
  /**
   * List of all slots, sorted by day and time.
   */
  sortedSlots: Slot[];
  /**
   * Preference list for each mentor.
   */
  prefByMentor: Map<number, SlotPreference[]>;
  /**
   * Callback when a row is changed.
   */
  onChangeRow: (mentorId: number, attr: keyof EditTableRow, value: any) => void;
  /**
   * Whether the row is selected.
   */
  isSelected: boolean;
  /**
   * Callback when the row is selected.
   */
  onSelect: (mentorId: number) => void;
}

/**
 * Row of the edit table.
 */
const EditTableRow = ({ row, sortedSlots, prefByMentor, onChangeRow, isSelected, onSelect }: EditTableRowProps) => {
  const [editingTimes, setEditingTimes] = useState<boolean>(false);
  const [prefBySlot, setPrefBySlot] = useState<Map<number, number>>(new Map());

  /**
   * Set of inputs that are currently in focus.
   * Prevents rerendering the input when the user is typing in a field.
   */
  const [focuses, setFocuses] = useState<Set<keyof EditTableRow>>(new Set());

  /* Dynamic keys to force refresh of input fields */
  const [capacityKey, setCapacityKey] = useState<number>(row.capacity);
  const [descriptionKey, setDescriptionKey] = useState<string>(row.description);

  /**
   * Reference to the select element;
   * used to set the focus when the user chooses to edit the times.
   */
  const selectTimesRef = useRef<HTMLSelectElement>(null);

  /* Get mentor preferences, stored by slot id. */
  useEffect(() => {
    const newPrefBySlot = new Map<number, number>();
    const prefs = prefByMentor.get(row.mentorId);
    if (prefs != null) {
      prefs.forEach(pref => {
        newPrefBySlot.set(pref.slot, pref.preference);
      });
    }
    setPrefBySlot(newPrefBySlot);
  }, [prefByMentor]);

  /* Focus the select input element when the user starts editing */
  useEffect(() => {
    if (editingTimes && selectTimesRef.current != null) {
      selectTimesRef.current.focus();
    }
  }, [editingTimes]);

  /**
   * Update the inputs if the row changes.
   * Does not update if the input is in focus,
   * or if the value did not change.
   */
  useEffect(() => {
    if (!focuses.has("capacity") && row.capacity != capacityKey) {
      setCapacityKey(row.capacity);
    } else if (!focuses.has("description") && row.description != descriptionKey) {
      setDescriptionKey(row.description);
    }
  }, [row]);

  /**
   * Toggles whether the user is editing the times.
   */
  const toggleEditingTimes = (e: React.MouseEvent<HTMLOrSVGElement, MouseEvent>) => {
    e.stopPropagation();
    setEditingTimes(!editingTimes);
  };

  /**
   * Format a datetime as a string for display.
   */
  const displayTime = (time: Time) => {
    return `${DAYS_ABBREV[time.day]} ${formatTime(time.startTime)}\u2013${formatTime(time.endTime)}`;
  };

  /**
   * Callback when the user changes an input value.
   */
  const handleChangeRow = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, attr: keyof EditTableRow) => {
    onChangeRow(row.mentorId, attr, e.target.value);
  };

  /**
   * Disable edit status upon blur.
   */
  const handleBlurSelect = () => {
    setEditingTimes(false);
  };

  /**
   * Keep track of which input the user just focused on.
   */
  const handleFocus = (attr: keyof EditTableRow) => {
    const newFocuses = new Set(focuses);
    newFocuses.add(attr);
    setFocuses(newFocuses);
  };

  /**
   * Keep track of which input the user just unfocused on.
   */
  const handleBlur = (attr: keyof EditTableRow) => {
    const newFocuses = new Set(focuses);
    newFocuses.delete(attr);
    setFocuses(newFocuses);
  };

  return (
    <div className="matcher-assignment-row">
      <label className="matcher-assignment-mentor-select">
        <input type="checkbox" checked={isSelected} onChange={() => onSelect(row.mentorId)} />
      </label>
      <div className="matcher-assignment-mentor-info">
        <div className="matcher-assignment-mentor-name">{row.name}</div>
        <div className="matcher-assignment-mentor-email">{row.email}</div>
      </div>
      <div className="matcher-assignment-section-times">
        {!editingTimes && (
          <div className="matcher-assignment-section-times-edit">
            <Pencil className="icon matcher-assignment-section-times-edit-icon" onClick={toggleEditingTimes} />
          </div>
        )}
        <div className="matcher-assignment-section-times-data">
          {editingTimes ? (
            <select
              ref={selectTimesRef}
              className="matcher-assignment-section-times-input"
              defaultValue={row.slotId}
              onChange={e => handleChangeRow(e, "times")}
              onBlur={handleBlurSelect}
            >
              {sortedSlots.map((slot: Slot) => (
                <option key={slot.id} value={slot.id} className="matcher-assignment-section-times-option">
                  {`(${prefBySlot.get(slot.id!)}) ` +
                    slot.times
                      .map<React.ReactNode>(time => displayTime(time))
                      .join(" / ")}
                </option>
              ))}
            </select>
          ) : (
            row.times.map((time, timeidx) => (
              <React.Fragment key={`slot-time-${timeidx}`}>
                <div className="matcher-assignment-time">{displayTime(time)}</div>
              </React.Fragment>
            ))
          )}
        </div>
      </div>
      <div className="matcher-assignment-section-capacity">
        <input
          key={capacityKey}
          className="matcher-assignment-section-capacity-input"
          type="number"
          min={0}
          defaultValue={row.capacity}
          onChange={e => handleChangeRow(e, "capacity")}
          onFocus={() => handleFocus("capacity")}
          onBlur={() => handleBlur("capacity")}
        />
      </div>
      <div className="matcher-assignment-section-description">
        <input
          key={descriptionKey}
          className="matcher-assignment-section-description-input"
          type="text"
          defaultValue={row.description}
          onChange={e => handleChangeRow(e, "description")}
          onFocus={() => handleFocus("description")}
          onBlur={() => handleBlur("description")}
        />
      </div>
    </div>
  );
};
