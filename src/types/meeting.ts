export interface User {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  hasGoogleCalendar: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  type: "meals" | "cafe" | "sports" | "others";
  durationMinutes: number;
  location?: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  preferredDays: string[];
  preferredTimes: string[];
  notes?: string;
  status: "collecting" | "voting" | "confirmed" | "cancelled";
  organizer: {
    id: string;
    displayName: string;
    pictureUrl?: string;
  };
  shareUrl: string;
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
