import { createApiHeaders, getApiBaseUrl } from "@/utils/apiHeaders";
import type { Meeting, CreateMeetingRequest, AvailableSlot, BusySlot } from "@/types/meeting";

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
  invitees?: InviteeRaw[];
  created_at: string;
  updated_at: string;
}

interface InviteeRaw {
  id: string;
  user_id?: string;
  line_user_id: string;
  display_name: string;
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

// --- Mapping helpers ---

function mapMeeting(raw: MeetingRaw): Meeting {
  return {
    id: raw.id,
    title: raw.title,
    organizerUserId: raw.organizer_user_id,
    lineGroupId: raw.line_group_id,
    status: raw.status,
    type: raw.type,
    durationMinutes: raw.duration_minutes,
    locationMode: raw.location_mode,
    location: raw.location,
    selectedDates: raw.selected_dates ?? [],
    timeSlots: raw.time_slots ?? [],
    memberMode: raw.member_mode,
    memberLineUserIds: raw.member_line_user_ids,
    notes: raw.notes,
    datetimeStart: raw.datetime_start,
    datetimeEnd: raw.datetime_end,
    invitees: raw.invitees?.map(mapInvitee),
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
    status: raw.status,
    createdAt: raw.created_at,
  };
}

function mapUser(raw: UserRaw) {
  return {
    id: raw.id,
    lineUserId: raw.line_user_id,
    displayName: raw.line_display_name,
    picture: raw.picture,
    hasGoogleCalendar: raw.hasGoogleCalendar,
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
    const res = await this.fetch<{ data: MeetingRaw[] }>(`/meetings/group/${groupId}`);
    return { data: res.data.map(mapMeeting) };
  }

  // Join meeting (links LINE user to invitee record)
  async joinMeeting(meetingId: string, lineUserId: string, displayName: string) {
    return this.fetch<{ data: unknown }>(`/meetings/${meetingId}/join`, {
      method: "POST",
      body: JSON.stringify({
        line_user_id: lineUserId,
        display_name: displayName,
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

  async syncGoogleCalendar(meetingId: string) {
    return this.fetch<{ data: { synced: boolean; busy_slots?: BusySlot[] } }>("/users/google/sync-calendar", {
      method: "POST",
      body: JSON.stringify({ meeting_id: meetingId }),
    });
  }

  // Availability
  async submitAvailability(meetingId: string, slots: AvailableSlot[], source: string) {
    return this.fetch<{ data: { message: string } }>(`/meetings/${meetingId}/availability`, {
      method: "PUT",
      body: JSON.stringify({ available_slots: slots, source }),
    });
  }

  async getUserAvailability(meetingId: string) {
    return this.fetch<{ data: UserAvailabilityRaw | null }>(`/meetings/${meetingId}/availability`);
  }

  // Locations
  async getLocations() {
    return this.fetch<{
      data: { id: string; name: string; latitude: number; longitude: number }[];
    }>("/locations");
  }
}

export const api = new ApiClient();
