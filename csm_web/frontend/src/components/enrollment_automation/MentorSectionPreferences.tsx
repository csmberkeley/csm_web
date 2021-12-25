import React, { useEffect, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { Profile } from "../../utils/types";
import { Preference } from "./EnrollmentAutomationTypes";

interface MentorSectionPreferencesProps {
  profile: Profile;
}

export function MentorSectionPreferences({ profile }: MentorSectionPreferencesProps): JSX.Element {
  const relation = profile.role.toLowerCase();

  const [slots, setSlots] = useState<Preference[]>([]);

  useEffect(() => {
    getSlots();
  }, [profile]);

  const getSlots = () => {
    fetchJSON(`matcher/${profile.courseId}/slots`).then(data => {
      const slots = [];
      for (const slot of data) {
        console.log(slot);
        const parsed_slot: Preference = {
          id: slot.id,
          // replace single quotes for JSON
          times: JSON.parse(slot.times.replace(/'/g, '"')),
          preference: 0
        };
        slots.push(parsed_slot);
      }
      setSlots(slots);
    });
  };

  const setPreference = (index: number, preference: number) => {
    const newSlots = [...slots];
    newSlots[index].preference = preference;
    setSlots(newSlots);
  };

  const postPreferences = () => {
    const cleaned_preferences: { id: number; preference: number }[] = [];
    for (const slot of slots) {
      if (slot.preference !== 0) {
        const cleaned_slot = {
          id: slot.id!,
          preference: slot.preference
        };
        cleaned_preferences.push(cleaned_slot);
      }
    }
    fetchWithMethod(`matcher/${profile.courseId}/preferences`, HTTP_METHODS.POST, cleaned_preferences);
  };

  return (
    <div>
      <h2>
        {profile.course} ({relation})
      </h2>
      {slots.map((slot, idx) => (
        <React.Fragment key={idx}>
          <div>
            {slot.times.map((time, time_idx) => (
              <div key={time_idx}>
                {time.day} {time.start_time}-{time.end_time}
              </div>
            ))}
          </div>
          <label>
            Preference:
            <input type="number" onChange={e => setPreference(idx, parseInt(e.target.value))} />
          </label>
        </React.Fragment>
      ))}
      <br />
      <input type="submit" value="Submit" onClick={postPreferences} />
    </div>
  );
}
