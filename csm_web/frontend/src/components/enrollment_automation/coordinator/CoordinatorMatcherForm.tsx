import React, { useEffect, useState } from "react";
// import { fetchJSON } from "../../../utils/api";
import { Profile } from "../../../utils/types";
import { parseTime } from "../utils";

import { MentorPreference, SlotPreference, Slot, Time } from "../EnrollmentAutomationTypes";
import { Switch } from "react-router-dom";
import { CreateStage } from "./CreateStage";
import { ReleaseStage } from "./ReleaseStage";
import { fetchJSON } from "../../../utils/api";

interface CoordinatorMatcherFormProps {
  profile: Profile;
}

interface Response {
  slot: number;
  preference: number;
}

interface Assignment {
  slot: number;
  mentor: number;
}

enum Stage {
  CREATE,
  RELEASE,
  EDIT,
  FINALIZE
}

interface StrTime {
  day: string;
  startTime: string;
  endTime: string;
}

// const fetchJSON = (url: string): Promise<any> => {
//   return new Promise((resolve, reject) => resolve(1));
// };

export function CoordinatorMatcherForm({ profile }: CoordinatorMatcherFormProps): JSX.Element {
  const relation = profile.role.toLowerCase();
  const [loaded, setLoaded] = useState<boolean>(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [prefByMentor, setPrefByMentor] = useState<Map<number, SlotPreference[]>>(new Map());
  const [prefBySlot, setPrefBySlot] = useState<Map<number, MentorPreference[]>>(new Map());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [formIsOpen, setFormIsOpen] = useState<boolean>(false);

  const [curStage, setCurStage] = useState<Stage>(Stage.CREATE);

  const fetchData = async () => {
    console.log("Fetch data");
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
              day: time.day
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
        const slotMap = new Map<number, MentorPreference[]>();
        for (const response of data.responses) {
          if (!mentorMap.has(response.mentor)) {
            mentorMap.set(response.mentor, []);
          }
          if (!slotMap.has(response.slot)) {
            slotMap.set(response.slot, []);
          }

          mentorMap.get(response.mentor)?.push({
            slot: response.slot,
            preference: response.preference
          });
          slotMap.get(response.slot)?.push({
            mentor: response.mentor,
            preference: response.preference
          });
        }

        setPrefByMentor(mentorMap);
        setPrefBySlot(slotMap);
      }),

      // fetch assignment
      fetchJSON(`matcher/${profile.courseId}/assignment`).then(data => {
        /**
         * Data format:
         * {
         *   "assignment": [  // list of assignments by id
         *      {"slot": number, "mentor": number},
         *      ...,
         *   ]
         * }
         */
        console.log(data);
        return data;
      })
    ]).then(values => {
      console.log(values);
      setLoaded(true);
    });
  };

  // fetch data on first load
  useEffect(() => {
    fetchData();
  }, []);

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

  STAGE 3: Configure -- REMOVE STAGE
    - When: Form closed AND exists responses
    - Now: able to configure the LP
    - Next: Runs LP

  before running the ILP, modal for students that haven't filled out the form
  treat students that haven't filled out the form as unmatched students

  STAGE 4: Edit
    - When: Exists assignment
    - Now: able to edit the assignment
    - Next: Updates assignment / Continue if no changes

  STAGE 5: Finalize
    - When: N/A; will always manually get to this stage on frontend
    - Now: able to edit section descriptions, capacities, etc. manually
    - Done: Create sections

    after creation, disable matcher and hide it
    further updates should be done through coordinator interface
  */

  if (!loaded) {
    return <div>Loading...</div>;
  }

  /**
   * Refetch data and recompute current stage
   */
  const refreshStage = (): void => {
    fetchData().then(() => {
      if (!formIsOpen && slots.length === 0) {
        setCurStage(Stage.CREATE);
      } else if (formIsOpen) {
        setCurStage(Stage.RELEASE);
      } else if (assignments.length > 0) {
        setCurStage(Stage.EDIT);
      } else {
        // default is create
        setCurStage(Stage.CREATE);
      }
    });
  };

  let curStageComponent: React.ReactNode = null;

  switch (curStage) {
    case Stage.CREATE:
      curStageComponent = <CreateStage profile={profile} initialSlots={slots} refreshStage={refreshStage} />;
      break;
    case Stage.RELEASE:
      curStageComponent = (
        <ReleaseStage profile={profile} slots={slots} prefBySlot={prefBySlot} prefByMentor={prefByMentor} />
      );
      break;
  }

  // TODO: remove the onclicks after finished; they're only here for debug purposes

  return (
    <div>
      <h2>
        {profile.course} ({relation})
      </h2>
      <div className="matcher-stages">
        <div
          className={`matcher-stages-stage ${curStage === Stage.CREATE ? "active-stage" : ""}`}
          onClick={() => setCurStage(Stage.CREATE)}
        >
          <div className="matcher-stages-stage-title">Create</div>
        </div>
        <div
          className={`matcher-stages-stage ${curStage === Stage.RELEASE ? "active-stage" : ""}`}
          onClick={() => setCurStage(Stage.RELEASE)}
        >
          <div className="matcher-stages-stage-title">Release</div>
        </div>
        <div className={`matcher-stages-stage ${curStage === Stage.EDIT ? "active-stage" : ""}`}>
          <div className="matcher-stages-stage-title">Edit</div>
        </div>
        <div className={`matcher-stages-stage ${curStage === Stage.FINALIZE ? "active-stage" : ""}`}>
          <div className="matcher-stages-stage-title">Finalize</div>
        </div>
      </div>
      <div className="matcher-content">{curStageComponent}</div>
    </div>
  );
}
