import React, { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import { fetchJSON, fetchWithMethod } from "../../../utils/api";
import { Mentor, Profile } from "../../../utils/types";
import Modal from "../../Modal";
import { SearchBar } from "../../SearchBar";
import { Calendar } from "../calendar/Calendar";
import { CalendarEventSingleTime, DAYS, DAYS_ABBREV } from "../calendar/CalendarTypes";
import { Assignment, Slot, SlotPreference, Time } from "../EnrollmentAutomationTypes";
import { formatInterval, formatTime } from "../utils";

import { Tooltip } from "../../Tooltip";

import InfoIcon from "../../../../static/frontend/img/info.svg";
import Pencil from "../../../../static/frontend/img/pencil.svg";
import SortDownIcon from "../../../../static/frontend/img/sort-down.svg";
import SortUnknownIcon from "../../../../static/frontend/img/sort-unknown.svg";
import SortUpIcon from "../../../../static/frontend/img/sort-up.svg";

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
    // empty times are always less than non-empty times
    if (a.length === 0) {
      return -1;
    } else if (b.length === 0) {
      return 1;
    }
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

enum SortDirection {
  ASCENDING = 1,
  DESCENDING = -1,
  UNKNOWN = 0
}

interface SortByType {
  attr: keyof EditTableRow;
  dir: SortDirection;
}

interface EditStageProps {
  profile: Profile;
  slots: Slot[];
  assignments: Assignment[];
  prefByMentor: Map<number, SlotPreference[]>;
  refreshAssignments: () => void;
  prevStage: () => void;
}

export const EditStage = ({
  profile,
  slots,
  assignments,
  prefByMentor,
  prevStage,
  refreshAssignments
}: EditStageProps): React.ReactElement => {
  /**
   * Table of mentor information and section metadata for editing.
   */
  const [unfilteredEditTable, setUnfilteredEditTable] = useState<EditTableRow[]>([]);
  /**
   * Filtered table of mentor information and section metadata for editing.
   */
  const [filteredEditTable, setFilteredEditTable] = useState<EditTableRow[]>([]);

  /**
   * Attribute to sort the table by,
   * specified in the form `{attr: key, dir: SortDirection}`.
   *
   * By default, sorts by time in ascending order.
   */
  const [tableSortBy, setTableSortBy] = useState<SortByType>({ attr: "times", dir: SortDirection.ASCENDING });
  /**
   * Search term for the filtered table.
   */
  const [searchTerm, setSearchTerm] = useState<string>("");

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
   * Set of mentor ids with assignments.
   */
  const [assignedMentors, setAssignedMentors] = useState<Set<number>>(new Set());

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

  /**
   * Whether the assignment distribution modal is open.
   */
  const [distModalOpen, setDistModalOpen] = useState<boolean>(false);
  /**
   * Whether the create section confirmation modal is open.
   */
  const [createConfirmModalOpen, setCreateConfirmModalOpen] = useState<boolean>(false);

  /**
   * History for redirection after section creation.
   */
  const history = useHistory();

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
    const assignedMentors = new Set<number>();
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
      assignedMentors.add(assignment.mentor);
    });
    mentorsById.forEach((mentor: Mentor, id: number) => {
      if (!assignedMentors.has(id)) {
        newEditTable.push({
          mentorId: id,
          slotId: -1,
          name: mentor.name,
          email: mentor.email,
          times: [],
          capacity: 0,
          description: ""
        });
      }
    });
    setAssignedMentors(assignedMentors);
    setUnfilteredEditTable(newEditTable);
    sortTable();
  }, [assignments, mentorsById]); // update when assignments change, or when mentors are fetched

  /* Filter table when search term changes, or when table changes */
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredEditTable(unfilteredEditTable);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = unfilteredEditTable.filter(row => {
        let include = false;
        include ||= row.name.toLowerCase().includes(lowercaseSearch);
        if (searchTerm.includes("@")) {
          include ||= row.email.toLowerCase().includes(lowercaseSearch);
        } else {
          include ||= row.email.split("@")[0].toLowerCase().includes(lowercaseSearch);
        }
        include ||= row.description.toLowerCase().includes(lowercaseSearch);
        return include;
      });
      setFilteredEditTable(filtered);
    }
  }, [unfilteredEditTable, searchTerm]);

  /**
   * Sort the table by the current sort attribute.
   */
  const sortTable = () => {
    setUnfilteredEditTable((oldEditTable: EditTableRow[]) =>
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
            return tableSortBy.dir as number;
          } else if (aVal < bVal) {
            return -tableSortBy.dir as number;
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
    const newEditTable = [...unfilteredEditTable];
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
        if (slotId === -1) {
          // unassign the mentor
          row.slotId = -1;
          row[attr] = [];
        } else {
          const slot = slotsById.get(slotId);
          if (slot == null) {
            return;
          }
          row.slotId = slotId;
          row[attr] = slot.times;
        }
      } else {
        // should not get here
        console.error(`Unknown attribute ${attr}`);
      }

      // update row
      newEditTable[rowIdx] = row;
      setUnfilteredEditTable(newEditTable);
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

  const gatherAssignments = (): Assignment[] => {
    const newAssignments: Assignment[] = [];
    unfilteredEditTable.forEach(row => {
      if (row.slotId === -1) {
        // unassigned
        return;
      }
      newAssignments.push({
        mentor: row.mentorId,
        slot: row.slotId,
        section: {
          capacity: row.capacity,
          description: row.description
        }
      });
    });
    return newAssignments;
  };

  /**
   * Send a PUT request to update the saved assignments in the database.
   */
  const saveAssignment = () => {
    const newAssignments = gatherAssignments();

    fetchWithMethod(`/matcher/${profile.courseId}/assignment`, "PUT", {
      assignment: newAssignments
    }).then(() => {
      refreshAssignments();
    });
  };

  /**
   * Send request to create sections.
   */
  const createSections = () => {
    const newAssignments = gatherAssignments();

    fetchWithMethod(`/matcher/${profile.courseId}/create`, "POST", {
      assignment: newAssignments
    }).then(async response => {
      if (response.ok) {
        history.push("/");
      } else {
        const json = await response.json();
        console.error(json);
        alert(json.error ?? "Error creating sections");
      }
    });
  };

  const handleSearchChange = (term?: string) => {
    setSearchTerm(term ?? "");
  };

  /**
   * Retrieves the sort direction of the specified attribute.
   * If the attribute is not sorted, returns SortDirection.UNKNOWN.
   *
   * @param attr attribute to sort by
   * @returns direction of sort for the attribute
   */
  const getSortDirection = (attr: keyof EditTableRow): SortDirection => {
    if (tableSortBy.attr === attr) {
      return tableSortBy.dir;
    } else {
      return SortDirection.UNKNOWN;
    }
  };

  const updateSort = (attr: keyof EditTableRow) => {
    if (tableSortBy.attr === attr) {
      if (tableSortBy.dir === SortDirection.ASCENDING) {
        setTableSortBy({ attr, dir: SortDirection.DESCENDING });
      } else {
        setTableSortBy({ attr, dir: SortDirection.ASCENDING });
      }
    } else {
      setTableSortBy({ attr, dir: SortDirection.ASCENDING });
    }
  };

  return (
    <div>
      <div>
        <div className="matcher-assignment-above-head">
          <SearchBar className="matcher-assignment-search" onChange={e => handleSearchChange(e.target.value)} />
          <button className="matcher-submit-btn" onClick={() => setDistModalOpen(true)}>
            View Distribution
          </button>
        </div>
        <div className="matcher-assignment-mentor-head">
          <label className="matcher-assignment-mentor-select">
            <input
              ref={headerCheckbox}
              checked={headerCheckboxState == 1}
              type="checkbox"
              onChange={handleHeaderSelect}
            />
          </label>
          <div className="matcher-assignment-mentor-info">
            <div className="matcher-table-sort-group" onClick={() => updateSort("name")}>
              <span>Mentor</span>
              <SortButton sortDirection={getSortDirection("name")} />
            </div>
          </div>
          <div className="matcher-assignment-section-times">
            <div className="matcher-table-sort-group" onClick={() => updateSort("times")}>
              <span>Times</span>
              <SortButton sortDirection={getSortDirection("times")} />
            </div>
          </div>
          <div className="matcher-assignment-section-capacity">
            <div className="matcher-table-sort-group" onClick={() => updateSort("capacity")}>
              <span>Capacity</span>
              <SortButton sortDirection={getSortDirection("capacity")} />
            </div>
          </div>
          <div className="matcher-assignment-section-description">Description</div>
        </div>
        {filteredEditTable.map((row: EditTableRow) => (
          <EditTableRow
            key={row.mentorId}
            row={row}
            sortedSlots={sortedSlots}
            prefByMentor={prefByMentor}
            onChangeRow={handleChangeRow}
            isSelected={selectedMentors.has(row.mentorId)}
            onSelect={handleSelect}
            isAssigned={assignedMentors.has(row.mentorId)}
          />
        ))}
      </div>
      <div className="matcher-body-footer matcher-body-footer-sticky">
        <div className="matcher-assignment-button-div">
          <button className="matcher-secondary-btn" onClick={() => prevStage()}>
            Back
          </button>
        </div>
        <div className="matcher-assignment-footer-help">
          {selectedMentors.size > 1 && (
            <React.Fragment>
              <InfoIcon className="icon matcher-assignment-footer-help-icon" />
              <span className="matcher-assignment-footer-help-text">Modify any input to bulk edit selected rows.</span>
            </React.Fragment>
          )}
        </div>
        <div className="matcher-assignment-button-div">
          <button className="matcher-secondary-btn" onClick={() => saveAssignment()}>
            Save
          </button>
          <button className="matcher-danger-btn" onClick={() => setCreateConfirmModalOpen(true)}>
            Create
          </button>
        </div>
      </div>
      <AssignmentDistributionModal
        isOpen={distModalOpen}
        closeModal={() => setDistModalOpen(false)}
        assignments={assignments}
        slots={slots}
      />
      <CreateConfirmModal
        isOpen={createConfirmModalOpen}
        closeModal={() => setCreateConfirmModalOpen(false)}
        createSections={createSections}
      />
    </div>
  );
};

interface SortButtonProps {
  sortDirection: SortDirection;
}

const SortButton = ({ sortDirection }: SortButtonProps) => {
  let icon = <SortUnknownIcon className="icon matcher-table-sort-icon" />;
  if (sortDirection == SortDirection.ASCENDING) {
    icon = <SortUpIcon className="icon matcher-table-sort-icon" />;
  } else if (sortDirection == SortDirection.DESCENDING) {
    icon = <SortDownIcon className="icon matcher-table-sort-icon" />;
  }
  return icon;
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
  /**
   * Whether or not this mentor was assigned by the matcher.
   * Checking for -1 does not work, as the user can make manual changes.
   */
  isAssigned: boolean;
}

/**
 * Row of the edit table.
 */
const EditTableRow = ({
  row,
  sortedSlots,
  prefByMentor,
  onChangeRow,
  isSelected,
  onSelect,
  isAssigned
}: EditTableRowProps) => {
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
    <div className={`matcher-assignment-row ${!isAssigned ? "unassigned" : ""}`}>
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
              {!isAssigned && (
                <option value={-1} className="matcher-assignment-section-times-option">
                  Unmatched
                </option>
              )}
              {sortedSlots.map((slot: Slot) => (
                <option key={slot.id} value={slot.id} className="matcher-assignment-section-times-option">
                  {(isAssigned ? `(${prefBySlot.get(slot.id!)}) ` : "") +
                    slot.times
                      .map<React.ReactNode>(time => displayTime(time))
                      .join(" / ")}
                </option>
              ))}
            </select>
          ) : row.times.length === 0 ? (
            <div className="matcher-assignment-time">Unmatched</div>
          ) : (
            row.times.map((time, timeidx) => (
              <div key={`slot-time-${timeidx}`} className="matcher-assignment-time">
                {displayTime(time)}
              </div>
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

interface AssignmentDistributionModalProps {
  isOpen: boolean;
  closeModal: () => void;
  assignments: Assignment[];
  slots: Slot[];
}

const MAX_COLOR = "124, 233, 162";

const AssignmentDistributionModal = ({
  isOpen,
  closeModal,
  assignments,
  slots
}: AssignmentDistributionModalProps): React.ReactElement | null => {
  /**
   * Map from slot id to number of mentors assigned to the slot.
   */
  const [assignmentCounts, setAssignmentCounts] = useState<Map<number, number>>(new Map());
  const [countExtrema, setCountExtrema] = useState<{ min: number; max: number }>({ min: 0, max: 0 });

  useEffect(() => {
    // initialize for all slot ids
    const emptyAssignmentCounts = new Map();
    for (const slot of slots) {
      emptyAssignmentCounts.set(slot.id!, 0);
    }
    // add counts for each assignment
    const newAssignmentCounts = assignments.reduce((acc, assignment) => {
      const count = acc.get(assignment.slot) || 0;
      acc.set(assignment.slot, count + 1);
      return acc;
    }, emptyAssignmentCounts);
    setAssignmentCounts(newAssignmentCounts);

    // extrema for highlighting
    const newCountExtrema = {
      min: Math.min(...newAssignmentCounts.values()),
      max: Math.max(...newAssignmentCounts.values())
    };
    setCountExtrema(newCountExtrema);
  }, [assignments]);

  if (!isOpen) {
    return null;
  }

  const getEventDetails = (event: CalendarEventSingleTime) => {
    const slotId = event.id;
    const curCount = assignmentCounts.get(slotId) ?? countExtrema.min;
    const opacity = (curCount - countExtrema.min) / (countExtrema.max - countExtrema.min);
    const color = `rgba(${MAX_COLOR}, ${opacity})`;

    return (
      <Tooltip
        className="matcher-assignment-distribution-tooltip"
        placement="bottom"
        source={
          <div className="matcher-assignment-distribution-div" style={{ backgroundColor: color }}>
            <span className="calendar-event-detail-time">
              {formatInterval(event.time.startTime, event.time.endTime)}
            </span>
          </div>
        }
      >
        Count: {curCount}
      </Tooltip>
    );
  };

  return (
    assignmentCounts && (
      <React.Fragment>
        <Modal closeModal={closeModal} className="matcher-calendar-modal">
          <div className="matcher-calendar-modal-contents">
            <Calendar
              events={slots}
              getEventDetails={getEventDetails}
              eventCreationEnabled={false}
              selectedEventIndices={[]}
              setSelectedEventIndices={() => {
                /* do nothing */
              }}
              limitScrolling={true}
              brighterLinkedTimes={false}
              flushDetails={true}
            />
          </div>
        </Modal>
      </React.Fragment>
    )
  );
};

interface CreateConfirmModalProps {
  isOpen: boolean;
  closeModal: () => void;
  createSections: () => void;
}

const CreateConfirmModal = ({
  isOpen,
  closeModal,
  createSections
}: CreateConfirmModalProps): React.ReactElement | null => {
  if (!isOpen) {
    return null;
  }
  return (
    <Modal closeModal={closeModal}>
      <div className="matcher-assignment-confirm-modal-contents">
        <div className="matcher-create-confirm-modal-body">
          <h3>Are you sure?</h3>
          <p>
            This will <b>irreversibly</b> create the sections and disable the matcher.
          </p>
        </div>
        <div className="matcher-assignment-confirm-modal-footer">
          <button className="matcher-secondary-btn" onClick={closeModal}>
            Cancel
          </button>
          <button className="matcher-danger-btn" onClick={createSections}>
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
};
