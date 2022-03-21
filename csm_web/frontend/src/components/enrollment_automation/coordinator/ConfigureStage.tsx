import React, { useState } from "react";

import { Profile } from "../../../utils/types";
import { Calendar, CalendarEventSingleTime } from "../calendar/Calendar";
import { MentorPreference, Slot, SlotPreference } from "../EnrollmentAutomationTypes";
import { formatTime } from "../utils";

interface ConfigureStageProps {
  profile: Profile;
  slots: Slot[];
  prefBySlot: Map<number, MentorPreference[]>;
  prefByMentor: Map<number, SlotPreference[]>;
}

export const ConfigureStage = ({ profile, slots, prefBySlot, prefByMentor }: ConfigureStageProps) => {
  const [selectedEventIdx, setSelectedEventIdx] = useState<number>(-1);

  const getEventDetails = (event: CalendarEventSingleTime) => {
    return (
      <span className="calendar-event-detail-time">
        {formatTime(event.time.startTime)}&#8211;{formatTime(event.time.endTime)}
      </span>
    );
  };

  return (
    <div>
      <Calendar
        events={slots}
        selectedEventIdx={selectedEventIdx}
        setSelectedEventIdx={setSelectedEventIdx}
        getEventDetails={getEventDetails}
        eventCreationEnabled={false}
      />
    </div>
  );
};
