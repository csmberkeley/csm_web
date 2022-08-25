import React, { useEffect, useState } from "react";
import { fetchJSON } from "../../../utils/api";
import { Profile } from "../../../utils/types";
import { parseTime } from "../utils";

import { Assignment, Slot, SlotPreference, Time } from "../EnrollmentAutomationTypes";
import { ConfigureStage } from "./ConfigureStage";
import { CreateStage } from "./CreateStage";
import { EditStage } from "./EditStage";
import { ReleaseStage } from "./ReleaseStage";

interface CoordinatorMatcherFormProps {
  profile: Profile;
  switchProfileEnabled: boolean;
  switchProfile: () => void;
}

enum Stage {
  CREATE,
  RELEASE,
  CONFIGURE,
  EDIT
}

interface StrTime {
  day: string;
  startTime: string;
  endTime: string;
}

export function CoordinatorMatcherForm({
  profile,
  switchProfile,
  switchProfileEnabled
}: CoordinatorMatcherFormProps): JSX.Element {
  const relation = profile.role.toLowerCase();
  const [loaded, setLoaded] = useState<boolean>(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [prefByMentor, setPrefByMentor] = useState<Map<number, SlotPreference[]>>(new Map());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [formIsOpen, setFormIsOpen] = useState<boolean>(false);

  const [curStage, setCurStage] = useState<Stage>(Stage.CREATE);

  const fetchData = async () => {
    // ensure all fetches complete
    await Promise.all([
      // fetch slot information
      fetchJSON(`matcher/${profile.courseId}/slots`).then(data => {
        /**
         * Data format:
         * {
         *   "slots": [
         *     {"id": number, "times": JSON_string}, ...
         *   ]
         * }
         */

        // convert times to numbers
        const new_slots: Slot[] = data.slots.map((slot: { id: number; times: StrTime[] }) => {
          const new_times: Time[] = slot.times.map((time: StrTime) => {
            return {
              startTime: parseTime(time.startTime),
              endTime: parseTime(time.endTime),
              day: time.day,
              isLinked: slot.times.length > 0
            };
          });
          return {
            id: slot.id,
            times: new_times
          };
        });
        setSlots(new_slots);
      }),

      // fetch response information
      fetchJSON(`matcher/${profile.courseId}/preferences`).then(data => {
        /**
         * Data format:
         * {
         *   "open": boolean,  // whether form is open to responses
         *   "responses": [  // list of responses
         *     {"slot": number, "mentor": number, "preference": number}, ...
         *   ]
         * }
         */
        setFormIsOpen(data.open);
        const mentorMap = new Map<number, SlotPreference[]>();
        for (const response of data.responses) {
          if (!mentorMap.has(response.mentor)) {
            mentorMap.set(response.mentor, []);
          }

          mentorMap.get(response.mentor)?.push({
            slot: response.slot,
            preference: response.preference
          });
        }

        setPrefByMentor(mentorMap);
      }),

      // fetch assignment
      refreshAssignments()
    ]).then(() => {
      setLoaded(true);
    });
  };

  const refreshAssignments = () => {
    return fetchJSON(`matcher/${profile.courseId}/assignment`).then(data => {
      /**
       * Data format:
       * {
       *   "assignment": [  // list of assignments by id
       *      {"slot": number, "mentor": number,
       *       "section": {"capacity": number, "description": string}},
       *      ...,
       *   ]
       * }
       */
      const assignment = data.assignment;
      setAssignments(assignment);
    });
  };

  /*

  Determining current stage:

  STAGE 1: Create
    - When: Form closed AND no slots
    - Now: able to create slots, submit slots
    - Next: releases form

  STAGE 2: Release
    - When: Form open
    - Now: nothing; coordinator should not be editing anything while form is open
        - perhaps have a live view of current responses
        - perhaps have a back button that will close the form and delete all responses to make any last minute changes
    - Next: closes form

  STAGE 3: Configure
    - When: Form closed AND exists responses
    - Now: able to configure min/max # of mentors per slot
        - perhaps also give choices of cost function
    - Next: Runs LP

  before running the ILP, modal for students that haven't filled out the form
  treat students that haven't filled out the form as unmatched students

  STAGE 4: Edit
    - When: Exists assignment
    - Now: able to edit the assignment, section descriptions, capacities, etc. manually
    - Done: Create sections

    after creation, disable matcher and hide it
    further updates should be done through coordinator interface
  */

  /**
   * Refetch data and recompute current stage
   */
  const refreshStage = async () => {
    return fetchData();
  };

  useEffect(() => {
    // update stage if anything has been updated
    if (!formIsOpen && slots.length === 0) {
      setCurStage(Stage.CREATE);
    } else if (formIsOpen) {
      setCurStage(Stage.RELEASE);
    } else if (!formIsOpen && prefByMentor.size > 0 && assignments.length == 0) {
      setCurStage(Stage.CONFIGURE);
    } else if (assignments.length > 0) {
      setCurStage(Stage.EDIT);
    } else {
      // default is create
      setCurStage(Stage.CREATE);
    }
  }, [formIsOpen, slots, prefByMentor, assignments]);

  // fetch data on first load
  useEffect(() => {
    refreshStage();
  }, [profile]);

  if (!loaded) {
    return <div>Loading...</div>;
  }

  // TODO: remove the onclicks after finished; they're only here for debug purposes

  return (
    <div>
      <div className="matcher-title">
        <h2>
          {profile.course} ({relation})
        </h2>
        {switchProfileEnabled && (
          <button className="matcher-secondary-btn" onClick={switchProfile}>
            Switch profile
          </button>
        )}
      </div>
      <div className="matcher-stages">
        <div className={`matcher-stages-stage ${curStage === Stage.CREATE ? "active-stage" : ""}`}>
          <div className="matcher-stages-stage-title">Create</div>
        </div>
        <div className={`matcher-stages-stage ${curStage === Stage.RELEASE ? "active-stage" : ""}`}>
          <div className="matcher-stages-stage-title">Release</div>
        </div>
        <div className={`matcher-stages-stage ${curStage === Stage.CONFIGURE ? "active-stage" : ""}`}>
          <div className="matcher-stages-stage-title">Configure</div>
        </div>
        <div className={`matcher-stages-stage ${curStage === Stage.EDIT ? "active-stage" : ""}`}>
          <div className="matcher-stages-stage-title">Edit</div>
        </div>
      </div>
      <div className="matcher-content">
        <CoordinatorMatcherFormSwitch
          stage={curStage}
          profile={profile}
          slots={slots}
          prefByMentor={prefByMentor}
          assignments={assignments}
          refreshStage={refreshStage}
          refreshAssignments={refreshAssignments}
          setCurStage={setCurStage}
        />
      </div>
    </div>
  );
}

interface CoordinatorMatcherFormSwitchProps {
  stage: Stage;
  profile: Profile;
  slots: Slot[];
  prefByMentor: Map<number, SlotPreference[]>;
  assignments: Assignment[];
  refreshStage: () => Promise<void>;
  refreshAssignments: () => Promise<void>;
  setCurStage: (stage: Stage) => void;
}

const CoordinatorMatcherFormSwitch = ({
  stage,
  profile,
  slots,
  prefByMentor,
  assignments,
  refreshStage,
  refreshAssignments,
  setCurStage
}: CoordinatorMatcherFormSwitchProps) => {
  switch (stage) {
    case Stage.CREATE:
      return <CreateStage profile={profile} initialSlots={slots} refreshStage={refreshStage} />;
    case Stage.RELEASE:
      return <ReleaseStage profile={profile} slots={slots} prefByMentor={prefByMentor} refreshStage={refreshStage} />;
    case Stage.CONFIGURE:
      return <ConfigureStage profile={profile} slots={slots} refreshStage={refreshStage} />;
    case Stage.EDIT:
      return (
        <EditStage
          profile={profile}
          slots={slots}
          assignments={assignments}
          prefByMentor={prefByMentor}
          prevStage={() => setCurStage(Stage.CONFIGURE)}
          refreshAssignments={refreshAssignments}
        />
      );
    default:
      return <div>Invalid stage</div>;
  }
};
