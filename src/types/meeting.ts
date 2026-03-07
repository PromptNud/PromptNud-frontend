export interface User {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  hasGoogleCalendar: boolean;
}

export interface TimeSlot {
  start: string; // HH:MM
  end: string;   // HH:MM
}

export interface Meeting {
  id: string;
  title: string;
  organizerUserId: string;
  lineGroupId: string;
  status: string;
  type: string;
  durationMinutes: number;
  locationMode: string;
  location?: string;
  selectedDates: string[];
  timeSlots: TimeSlot[];
  memberMode: string;
  memberLineUserIds?: string[];
  notes?: string;
  datetimeStart?: string;
  datetimeEnd?: string;
  invitees?: {
    id: string;
    userId?: string;
    lineUserId: string;
    displayName: string;
    status: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingRequest {
  title: string;
  lineGroupId: string;
  type: string;
  durationMinutes: number;
  locationMode: string;
  location?: string;
  selectedDates: string[];
  timeSlots: { start: string; end: string }[];
  memberMode: string;
  notes?: string;
}

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  hour: string; // HH:MM
}

export interface BusySlot {
  start: string; // RFC3339
  end: string;   // RFC3339
}
