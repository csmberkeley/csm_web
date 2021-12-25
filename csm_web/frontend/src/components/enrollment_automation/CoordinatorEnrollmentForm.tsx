import React, { useState } from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { Profile } from "../../utils/types";
import { Slot, Time } from "./EnrollmentAutomationTypes";

interface CoordinatorEnrollmentFormProps {
  profile: Profile;
}

export function CoordinatorEnrollmentForm({ profile }: CoordinatorEnrollmentFormProps): JSX.Element {
  const relation = profile.role.toLowerCase();
  const [validSlots, setValidSlots] = useState<Slot[]>([]);
  const [numIntervals, setNumIntervals] = useState<number>(1);

  const addTime = (e: React.FormEvent<HTMLFormElement>) => {
    // stop page reload
    e.preventDefault();
    const times: Time[] = [];
    for (let i = 0; i < numIntervals; i++) {
      const curElement = e.currentTarget.elements.namedItem("time" + i);
      // get the form data
      const curTime = {
        day: curElement.elements.namedItem("day").value,
        start_time: curElement.elements.namedItem("start_time").value,
        end_time: curElement.elements.namedItem("end_time").value
      };

      // make sure all fields are filled
      if (!curTime.day || !curTime.start_time || !curTime.end_time) {
        return;
      }
      times.push(curTime);
    }

    const timeSlot: Slot = {
      times: times,
      num_mentors: parseInt(e.currentTarget.elements.namedItem("num_mentors").value)
    };

    // check if all fields are filled
    if (!timeSlot.numMentors) {
      return;
    }
    setValidSlots([...validSlots, timeSlot]);
  };

  const removeSlot = (index: number) => {
    setValidSlots(validSlots.filter((_, i) => i !== index));
  };

  const postSlots = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchWithMethod(`matcher/${profile.courseId}/slots`, HTTP_METHODS.POST, validSlots);
  };

  /*
  END GOAL:
  - calendar display to create and view slots
  - button to toggle create new slots
  - when creating slots:
    - click and drag to create a slot
    - can click and drag again to link a new interval to the same slot
    - time info shown in sidebar, always editable; calendar events should reflect this
  - save button to save the slot
  - when not creating new slots:
    - click on slot to bring up its information, which should be editable
  */

  return (
    <div>
      <h2>
        {profile.course} ({relation})
      </h2>
      <form onSubmit={addTime}>
        <label>
          Num. Intervals:
          <input
            name="numTimes"
            type="number"
            defaultValue="1"
            min="1"
            onChange={e => (e.target.value.match(/\d+/) ? setNumIntervals(parseInt(e.target.value)) : null)}
          />
        </label>
        {Array.from(Array(numIntervals).keys()).map((_, idx) => (
          <fieldset name={"time" + idx} key={idx}>
            <label>
              <select name="day">
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
            </label>
            <label>
              Start Time:
              <input name="start_time" type="time" />
            </label>
            <label>
              End Time:
              <input name="end_time" type="time" />
            </label>
          </fieldset>
        ))}
        <label>
          Num. Mentors:
          <input name="num_mentors" type="number" />
        </label>
        <input type="submit" value="Submit" />
      </form>
      {validSlots.map((slot, index) => (
        <div key={index}>
          {slot.times.map((time, idx) => (
            <p key={idx}>
              {time.day} {time.start_time} - {time.end_time}
            </p>
          ))}
          <p>Num. Mentors: {slot.num_mentors}</p>
          <button onClick={() => removeSlot(index)}>Remove slot</button>
        </div>
      ))}
      <form onSubmit={postSlots}>
        <input type="submit" value="Post Slots" />
      </form>
    </div>
  );
}
