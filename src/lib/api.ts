import { createApiHeaders, getApiBaseUrl } from "@/utils/apiHeaders";
import type { Meeting, CreateMeetingRequest, AvailableSlot, BusySlot } from "@/types/meeting";

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
    return this.fetch<{
      data: {
        id: string;
        line_user_id: string;
        line_display_name: string;
        picture?: string;
        hasGoogleCalendar: boolean;
      };
    }>("/users/me");
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
    return this.fetch<{ data: Meeting }>("/meetings", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getMeeting(id: string) {
    return this.fetch<{ data: Meeting }>(`/meetings/${id}`);
  }

  async getMeetingsByGroup(groupId: string) {
    return this.fetch<{ data: Meeting[] }>(`/meetings/group/${groupId}`);
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
    return this.fetch<{
      data: {
        id: string;
        meeting_id: string;
        user_id: string;
        available_slots: AvailableSlot[];
        source: string;
        created_at: string;
        updated_at: string;
      } | null;
    }>(`/meetings/${meetingId}/availability`);
  }

  // Locations
  async getLocations(): Promise<{
    data: { id: string; name: string; latitude: number; longitude: number }[];
  }> {
    return this.fetch<{
      data: { id: string; name: string; latitude: number; longitude: number }[];
    }>("/locations");
  }
}

export const api = new ApiClient();
