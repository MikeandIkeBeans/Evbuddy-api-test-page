export interface DaySchedule {
  day_of_week: number;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
}

export interface HoursException {
  id: number;
  date_value: string;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
  note?: string;
}

export type ScopeType = "site" | "business" | "charger";
