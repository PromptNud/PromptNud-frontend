import { createApiHeaders, getApiBaseUrl } from "@/utils/apiHeaders";
import type { Meeting, CreateMeetingRequest } from "@/types/meeting";

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
      throw new Error(error.message || `Request failed: ${response.status}`);
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

  async getMeeting(id: string): Promise<Meeting> {
    return this.fetch<Meeting>(`/meetings/${id}`);
  }

  async getMeetingsByGroup(groupId: string): Promise<{ meetings: Meeting[] }> {
    return this.fetch<{ meetings: Meeting[] }>(`/meetings/group/${groupId}`);
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
