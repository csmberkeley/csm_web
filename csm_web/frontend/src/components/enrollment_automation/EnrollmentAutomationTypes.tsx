export interface Time {
  day: string;
  start_time: string;
  end_time: string;
}

export interface Slot {
  times: Time[];
  num_mentors: number;
}

export interface Preference {
  id?: number;
  times: Time[];
  preference: number;
}
