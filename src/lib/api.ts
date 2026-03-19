import { createApiHeaders, getApiBaseUrl } from "@/utils/apiHeaders";
import type { Meeting, CreateMeetingRequest, AvailableSlot, BusySlot, MeetingListItem, MeetingStatus, MeetingTypeEnum, LocationMode, SchedulingRanking, VoteSummary, VoteSummarySlot } from "@/types/meeting";

// --- Raw snake_case response types matching backend JSON ---

interface MeetingRaw {
  id: string;
  title: string;
  organizer_user_id: string;
  line_group_id: string;
  status: string;
  type: string;
  duration_minutes: number;
  location_mode: string;
  location?: string;
  selected_dates: string[];
  time_slots: { start: string; end: string }[];
  member_mode: string;
  member_line_user_ids?: string[];
  notes?: string;
  datetime_start?: string;
  datetime_end?: string;
  rankings?: SchedulingRankingRaw[];
  invitees?: InviteeRaw[];
  created_at: string;
  updated_at: string;
}

interface InviteeRaw {
  id: string;
  user_id?: string;
  line_user_id: string;
  display_name: string;
  picture_url?: string;
  status: string;
  created_at: string;
}

interface UserRaw {
  id: string;
  line_user_id: string;
  line_display_name: string;
  picture?: string;
  hasGoogleCalendar: boolean; // backend already sends this in camelCase
}

interface UserAvailabilityRaw {
  id: string;
  meeting_id: string;
  user_id: string;
  available_slots: AvailableSlot[];
  source: string;
  created_at: string;
  updated_at: string;
}

interface MeetingListItemRaw {
  id: string;
  title: string;
  organizer_user_id: string;
  line_group_id: string;
  status: string;
  type: string;
  duration_minutes: number;
  location_mode: string;
  location?: string;
  selected_dates: string[];
  member_mode: string;
  notes?: string;
  datetime_start?: string;
  datetime_end?: string;
  invitee_count: number;
  created_at: string;
  updated_at: string;
}

interface SchedulingRankingRaw {
  rank: number;
  date: string;
  day_name?: string;
  start_time: string;
  end_time: string;
  score: number;
  attendance: string;
  reasoning: string;
  missing_persons?: string[];
  trade_off?: string;
}

interface VoteSummarySlotRaw {
  rank: number;
  date: string;
  start_time: string;
  end_time: string;
  score: number;
  attendance: string;
  vote_count: number;
  voter_ids: string[];
}

interface VoteSummaryRaw {
  meeting_id: string;
  total_voters: number;
  slots: VoteSummarySlotRaw[];
}

// --- Mapping helpers ---

const VALID_STATUSES: MeetingStatus[] = ["collecting", "voting", "confirmed", "cancelled"];
const VALID_TYPES: MeetingTypeEnum[] = ["meals", "cafe", "sports", "others"];
const VALID_LOCATION_MODES: LocationMode[] = ["specify", "decide_later", "recommend"];

function mapMeeting(raw: MeetingRaw): Meeting {
  if (!VALID_STATUSES.includes(raw.status as MeetingStatus)) {
    throw new Error(`Unknown meeting status: ${raw.status}`);
  }
  if (!VALID_TYPES.includes(raw.type as MeetingTypeEnum)) {
    throw new Error(`Unknown meeting type: ${raw.type}`);
  }
  if (!VALID_LOCATION_MODES.includes(raw.location_mode as LocationMode)) {
    throw new Error(`Unknown location mode: ${raw.location_mode}`);
  }

  return {
    id: raw.id,
    title: raw.title,
    organizerUserId: raw.organizer_user_id,
    lineGroupId: raw.line_group_id,
    status: raw.status as MeetingStatus,
    type: raw.type as MeetingTypeEnum,
    durationMinutes: raw.duration_minutes,
    locationMode: raw.location_mode as LocationMode,
    location: raw.location,
    selectedDates: raw.selected_dates ?? [],
    timeSlots: raw.time_slots ?? [],
    memberMode: raw.member_mode,
    memberLineUserIds: raw.member_line_user_ids,
    notes: raw.notes,
    datetimeStart: raw.datetime_start,
    datetimeEnd: raw.datetime_end,
    rankings: raw.rankings?.map(mapSchedulingRanking),
    invitees: raw.invitees?.map(mapInvitee),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapMeetingListItem(raw: MeetingListItemRaw): MeetingListItem {
  if (!VALID_STATUSES.includes(raw.status as MeetingStatus)) {
    throw new Error(`Unknown meeting status: ${raw.status}`);
  }
  if (!VALID_TYPES.includes(raw.type as MeetingTypeEnum)) {
    throw new Error(`Unknown meeting type: ${raw.type}`);
  }
  if (!VALID_LOCATION_MODES.includes(raw.location_mode as LocationMode)) {
    throw new Error(`Unknown location mode: ${raw.location_mode}`);
  }

  return {
    id: raw.id,
    title: raw.title,
    organizerUserId: raw.organizer_user_id,
    lineGroupId: raw.line_group_id,
    status: raw.status as MeetingStatus,
    type: raw.type as MeetingTypeEnum,
    durationMinutes: raw.duration_minutes,
    locationMode: raw.location_mode as LocationMode,
    location: raw.location,
    selectedDates: raw.selected_dates ?? [],
    memberMode: raw.member_mode,
    notes: raw.notes,
    datetimeStart: raw.datetime_start,
    datetimeEnd: raw.datetime_end,
    inviteeCount: raw.invitee_count,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapInvitee(raw: InviteeRaw) {
  return {
    id: raw.id,
    userId: raw.user_id,
    lineUserId: raw.line_user_id,
    displayName: raw.display_name,
    pictureUrl: raw.picture_url,
    status: raw.status,
    createdAt: raw.created_at,
  };
}

function mapSchedulingRanking(raw: SchedulingRankingRaw): SchedulingRanking {
  return {
    rank: raw.rank,
    date: raw.date,
    dayName: raw.day_name,
    startTime: raw.start_time,
    endTime: raw.end_time,
    score: raw.score,
    attendance: raw.attendance,
    reasoning: raw.reasoning,
    missingPersons: raw.missing_persons,
    tradeOff: raw.trade_off,
  };
}

function mapVoteSummary(raw: VoteSummaryRaw): VoteSummary {
  return {
    meetingId: raw.meeting_id,
    totalVoters: raw.total_voters,
    slots: (raw.slots ?? []).map((s): VoteSummarySlot => ({
      rank: s.rank,
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      score: s.score,
      attendance: s.attendance,
      voteCount: s.vote_count,
      voterIds: s.voter_ids,
    })),
  };
}

function mapUser(raw: UserRaw) {
  return {
    id: raw.id,
    lineUserId: raw.line_user_id,
    displayName: raw.line_display_name,
    pictureUrl: raw.picture,
    hasGoogleCalendar: raw.hasGoogleCalendar,
  };
}

interface SyncCalendarResponse {
  synced: boolean;
  busySlots: BusySlot[];
}

interface UserAvailability {
  id: string;
  meetingId: string;
  userId: string;
  availableSlots: AvailableSlot[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

function mapUserAvailability(raw: UserAvailabilityRaw): UserAvailability {
  return {
    id: raw.id,
    meetingId: raw.meeting_id,
    userId: raw.user_id,
    availableSlots: raw.available_slots,
    source: raw.source,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

// --- API client ---

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = getApiBaseUrl();

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...createApiHeaders(),
        ...options.headers,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.message || `Request failed: ${response.status}`,
        response.status,
      );
    }

    return response.json();
  }

  // User
  async getMe() {
    const res = await this.fetch<{ data: UserRaw }>("/users/me");
    return { data: mapUser(res.data) };
  }

  // Meetings
  async createMeeting(data: CreateMeetingRequest) {
    const body = {
      title: data.title,
      line_group_id: data.lineGroupId,
      type: data.type,
      duration_minutes: data.durationMinutes,
      location_mode: data.locationMode,
      location: data.location,
      selected_dates: data.selectedDates,
      time_slots: data.timeSlots,
      member_mode: data.memberMode,
      notes: data.notes,
    };
    const res = await this.fetch<{ data: MeetingRaw }>("/meetings", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { data: mapMeeting(res.data) };
  }

  async getMeeting(id: string) {
    const res = await this.fetch<{ data: MeetingRaw }>(`/meetings/${id}`);
    return { data: mapMeeting(res.data) };
  }

  async getMeetingsByGroup(groupId: string) {
    const res = await this.fetch<{ data: MeetingListItemRaw[] }>(`/meetings/group/${encodeURIComponent(groupId)}`);
    return { data: res.data.map(mapMeetingListItem) };
  }

  // Join meeting (links LINE user to invitee record)
  async joinMeeting(meetingId: string, lineUserId: string, displayName: string, pictureUrl?: string) {
    return this.fetch<{ data: unknown }>(`/meetings/${meetingId}/join`, {
      method: "POST",
      body: JSON.stringify({
        line_user_id: lineUserId,
        display_name: displayName,
        picture_url: pictureUrl ?? "",
      }),
    });
  }

  // Google Calendar
  async getGoogleAuthUrl(meetingId: string) {
    const res = await this.fetch<{ data: { auth_url: string } }>(
      `/users/google/auth-url?meeting_id=${encodeURIComponent(meetingId)}`
    );
    return { data: { authUrl: res.data.auth_url } };
  }

  async syncGoogleCalendar(meetingId: string): Promise<{ data: SyncCalendarResponse }> {
    const res = await this.fetch<{ data: { synced: boolean; busy_slots?: BusySlot[] } }>("/users/google/sync-calendar", {
      method: "POST",
      body: JSON.stringify({ meeting_id: meetingId }),
    });
    return {
      data: {
        synced: res.data.synced,
        busySlots: res.data.busy_slots ?? [],
      },
    };
  }

  // Availability
  async submitAvailability(meetingId: string, slots: AvailableSlot[], source: string) {
    return this.fetch<{ data: { message: string } }>(`/meetings/${meetingId}/availability`, {
      method: "PUT",
      body: JSON.stringify({ available_slots: slots, source }),
    });
  }

  async getUserAvailability(meetingId: string): Promise<{ data: UserAvailability | null }> {
    const res = await this.fetch<{ data: UserAvailabilityRaw | null }>(`/meetings/${meetingId}/availability`);
    return { data: res.data ? mapUserAvailability(res.data) : null };
  }

  // Voting
  async submitVote(meetingId: string, rankingIndices: number[]) {
    return this.fetch<{ data: { message: string } }>(`/meetings/${meetingId}/vote`, {
      method: "POST",
      body: JSON.stringify({ ranking_indices: rankingIndices }),
    });
  }

  async getVoteSummary(meetingId: string): Promise<{ data: VoteSummary }> {
    const res = await this.fetch<{ data: VoteSummaryRaw }>(`/meetings/${meetingId}/votes`);
    return { data: mapVoteSummary(res.data) };
  }

  // Locations
  async getLocations() {
    return this.fetch<{
      data: { id: string; name: string; latitude: number; longitude: number }[];
    }>("/locations");
  }
}

export const api = new ApiClient();
