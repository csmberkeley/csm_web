export interface Time {
  day: string;
  startTime: number;
  endTime: number;
}

export interface Slot {
  id?: number;
  times: Time[];
  [key: string]: any;
}

/**
 * Preference for a slot, to be associated with a single mentor
 */
export interface SlotPreference {
  slot: number;
  preference: number;
}

/**
 * Preference given by a mentor, to be associated with a single slot
 */
export interface MentorPreference {
  mentor: number;
  preference: number;
}
