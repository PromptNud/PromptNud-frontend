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
  organizerDisplayName: string;
  organizerPictureUrl?: string;
  organizerHasSubmittedAvailability: boolean;
  lineGroupId: string;
  status: MeetingStatus;
  type: MeetingTypeEnum;
  durationMinutes: number;
  locationMode: LocationMode;
  location?: string;
  selectedDates: string[];
  timeSlots: TimeSlot[];
  memberMode: string;
  memberLineUserIds?: string[];
  groupMemberCount: number;
  notes?: string;
  datetimeStart?: string;
  datetimeEnd?: string;
  rankings?: SchedulingRanking[];
  venueRecommendations?: VenueResult;
  invitees?: {
    id: string;
    userId?: string;
    lineUserId: string;
    displayName: string;
    pictureUrl?: string;
    status: string;
    hasSubmittedAvailability: boolean;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingRequest {
  title: string;
  lineGroupId: string;
  type: MeetingTypeEnum;
  durationMinutes: number;
  locationMode: LocationMode;
  location?: string;
  selectedDates: string[];
  timeSlots: { start: string; end: string }[];
  memberMode: string;
  notes?: string;
}

// Meeting statuses (matches backend enum)
export type MeetingStatus = "collecting" | "voting" | "confirmed" | "cancelled";

// Meeting type enum
export type MeetingTypeEnum = "meals" | "cafe" | "sports" | "others";

// Location mode enum
export type LocationMode = "specify" | "decide_later" | "recommend";

// Filter tabs for meetings list page
export type MeetingFilterTab = "all" | "active" | "confirmed" | "cancelled" | "past";

// Lightweight meeting for list views (matches backend MeetingListResponse)
export interface MeetingListItem {
  id: string;
  title: string;
  organizerUserId: string;
  lineGroupId: string;
  status: MeetingStatus;
  type: MeetingTypeEnum;
  durationMinutes: number;
  locationMode: LocationMode;
  location?: string;
  selectedDates: string[];
  memberMode: string;
  groupMemberCount: number;
  notes?: string;
  datetimeStart?: string;
  datetimeEnd?: string;
  inviteeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  hour: string; // HH:MM
}

export interface BusySlot {
  start: string; // RFC3339
  end: string;   // RFC3339
}

export interface SchedulingRanking {
  rank: number;
  date: string;
  dayName?: string;
  startTime: string;
  endTime: string;
  score: number;
  attendance: string;
  reasoning: string;
  missingPersons?: string[];
  tradeOff?: string;
}

export interface VenueRanking {
  rank: number;
  name: string;
  placeId: string;
  rating: number;
  priceLabel?: string;
  distanceKm?: number;
  score: number;
  rationale: string;
  highlights?: string[];
  concerns?: string[];
  vegetarianFriendly?: boolean;
}

export interface VenueResult {
  rankings: VenueRanking[];
  refinementUsed: string;
  suggestion: string;
}

export interface VoteSummarySlot {
  rank: number;
  date: string;
  startTime: string;
  endTime: string;
  score: number;
  attendance: string;
  voteCount: number;
  voterIds: string[];
}

export interface VoteSummary {
  meetingId: string;
  totalVoters: number;
  slots: VoteSummarySlot[];
}
