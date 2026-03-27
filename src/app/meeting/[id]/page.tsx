"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import Link from "next/link";
import { useLiff } from "@/hooks/useLiff";
import { api, ApiError } from "@/lib/api";
import type {
  Meeting,
  MeetingStatus,
  MeetingTypeEnum,
  LocationMode,
} from "@/types/meeting";

// --- Status config ---

const STATUS_CONFIG: Record<
  MeetingStatus,
  { bg: string; text: string; icon: string; label: string; pillBg: string; pillText: string; pillBorder: string }
> = {
  collecting: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: "edit_calendar",
    label: "COLLECTING",
    pillBg: "bg-amber-500",
    pillText: "text-white",
    pillBorder: "border-white",
  },
  voting: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: "how_to_vote",
    label: "VOTING",
    pillBg: "bg-blue-500",
    pillText: "text-white",
    pillBorder: "border-white",
  },
  confirmed: {
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "check_circle",
    label: "CONFIRMED",
    pillBg: "bg-emerald-500",
    pillText: "text-white",
    pillBorder: "border-white",
  },
  cancelled: {
    bg: "bg-red-100",
    text: "text-red-700",
    icon: "cancel",
    label: "CANCELLED",
    pillBg: "bg-red-500",
    pillText: "text-white",
    pillBorder: "border-white",
  },
};

// --- Meeting type icons ---

const TYPE_ICON: Record<MeetingTypeEnum, { icon: string; label: string }> = {
  meals: { icon: "restaurant", label: "Meals" },
  cafe: { icon: "local_cafe", label: "Cafe" },
  sports: { icon: "sports_soccer", label: "Sports" },
  others: { icon: "more_horiz", label: "Others" },
};

// --- Helpers ---

function locationDisplay(mode: LocationMode, location?: string) {
  switch (mode) {
    case "specify":
      return { icon: "location_on", text: location || "Specified" };
    case "decide_later":
      return { icon: "location_off", text: "Decide Later" };
    case "recommend":
      return { icon: "explore", text: "Recommendation" };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unhandled LocationMode: ${_exhaustive}`);
    }
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatSelectedDateRange(dates: string[]): string {
  if (dates.length === 0) return "No dates selected";
  const sorted = [...dates].sort();
  const first = parse(sorted[0], "yyyy-MM-dd", new Date());
  if (sorted.length === 1) return format(first, "EEEE, MMMM d, yyyy");
  const last = parse(sorted[sorted.length - 1], "yyyy-MM-dd", new Date());
  return `${format(first, "MMM d")} - ${format(last, "MMM d, yyyy")}`;
}

function formatTimeSlotsRange(timeSlots: { start: string; end: string }[]): string {
  if (timeSlots.length === 0) return "No time slots";
  return timeSlots.map((s) => `${s.start} - ${s.end}`).join(", ");
}

// --- Avatar ---

function Avatar({
  pictureUrl,
  displayName,
  size = "h-12 w-12",
}: {
  pictureUrl?: string;
  displayName: string;
  size?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initial = displayName.charAt(0).toUpperCase();

  if (!pictureUrl || imgError) {
    return (
      <div
        role="img"
        aria-label={displayName}
        className={`${size} rounded-full bg-gray-200 flex items-center justify-center`}
      >
        <span className="text-xs font-bold text-gray-500">{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={pictureUrl}
      alt={displayName}
      className={`${size} rounded-full object-cover`}
      onError={() => setImgError(true)}
    />
  );
}

// --- Status Badge ---

function StatusBadge({ status }: { status: MeetingStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <div className="flex justify-center -mt-4 relative z-10">
      <div
        className={`${config.pillBg} px-4 py-2 rounded-full flex items-center gap-2 shadow-md border-2 ${config.pillBorder}`}
      >
        <span
          aria-hidden="true"
          className={`material-symbols-outlined ${config.pillText} text-sm font-bold`}
        >
          {config.icon}
        </span>
        <span
          className={`${config.pillText} text-xs font-bold tracking-wider`}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}

// --- Summary Card ---

function SummaryCard({ meeting }: { meeting: Meeting }) {
  const typeInfo = TYPE_ICON[meeting.type] || TYPE_ICON.others;
  const loc = locationDisplay(meeting.locationMode, meeting.location);

  const isConfirmed = meeting.status === "confirmed" && meeting.datetimeStart;
  let dateDisplay: string;
  let timeDisplay: string;

  if (isConfirmed && meeting.datetimeStart) {
    const start = new Date(meeting.datetimeStart);
    dateDisplay = format(start, "EEEE, MMMM d, yyyy");
    if (meeting.datetimeEnd) {
      const end = new Date(meeting.datetimeEnd);
      timeDisplay = `${format(start, "HH:mm")} - ${format(end, "HH:mm")} (${formatDuration(meeting.durationMinutes)})`;
    } else {
      timeDisplay = `${format(start, "HH:mm")} (${formatDuration(meeting.durationMinutes)})`;
    }
  } else {
    dateDisplay = formatSelectedDateRange(meeting.selectedDates);
    timeDisplay = meeting.timeSlots.length > 0
      ? `${formatTimeSlotsRange(meeting.timeSlots)} (${formatDuration(meeting.durationMinutes)})`
      : formatDuration(meeting.durationMinutes);
  }

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#f98006]/10">
      <h2 className="text-xl font-bold mb-4">{meeting.title}</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-gray-600">
          <span aria-hidden="true" className="material-symbols-outlined text-[#f98006] text-xl">
            calendar_today
          </span>
          <p className="text-sm font-medium">{dateDisplay}</p>
        </div>
        <div className="flex items-center gap-3 text-gray-600">
          <span aria-hidden="true" className="material-symbols-outlined text-[#f98006] text-xl">
            {typeInfo.icon}
          </span>
          <p className="text-sm font-medium">{typeInfo.label}</p>
        </div>
        <div className="flex items-center gap-3 text-gray-600">
          <span aria-hidden="true" className="material-symbols-outlined text-[#f98006] text-xl">
            schedule
          </span>
          <p className="text-sm font-medium">{timeDisplay}</p>
        </div>
        <div className="flex items-center gap-3 text-gray-600">
          <span aria-hidden="true" className="material-symbols-outlined text-[#f98006] text-xl">
            {loc.icon}
          </span>
          <p className="text-sm font-medium">{loc.text}</p>
        </div>
      </div>
    </div>
  );
}

// --- Attendees Card ---

function AttendeesCard({ meeting }: { meeting: Meeting }) {
  const invitees = meeting.invitees ?? [];
  const isCollecting = meeting.status === "collecting";
  const isConfirmed = meeting.status === "confirmed";
  const displayInvitees = isConfirmed
    ? invitees.filter((i) => i.status === "joined")
    : invitees;
  const MAX_AVATARS = 8;

  // Count submitted availabilities (organizer + invitees) during collecting phase
  const submittedCount = isCollecting
    ? (meeting.organizerHasSubmittedAvailability ? 1 : 0) +
      invitees.filter((i) => i.hasSubmittedAvailability).length
    : 0;
  const totalMembers = meeting.groupMemberCount || invitees.length + 1; // +1 for organizer
  const joinedCount = invitees.filter((i) => i.status === "joined").length;
  const hasOrganizer = !!meeting.organizerDisplayName;
  const displayedJoined = joinedCount + (hasOrganizer ? 1 : 0);
  const displayedTotal = invitees.length + (hasOrganizer ? 1 : 0);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#f98006]/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">
          {isConfirmed ? "Confirmed Attendees" : "Attendees"}
        </h3>
        {isCollecting ? (
          <span className="text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-1 rounded">
            {submittedCount}/{totalMembers} Submitted
          </span>
        ) : (
          <span className="text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded">
            {displayedJoined}/{displayedTotal} Joined
          </span>
        )}
      </div>
      {displayInvitees.length === 0 && !meeting.organizerDisplayName ? (
        <p className="text-sm text-gray-400">No attendees yet</p>
      ) : (
        <div className="flex -space-x-2 overflow-hidden">
          {/* Organizer avatar (always first) */}
          {meeting.organizerDisplayName && (
            <div className="relative">
              <div className={`h-12 w-12 rounded-full ring-2 ring-white overflow-hidden ${isCollecting && !meeting.organizerHasSubmittedAvailability ? "opacity-50" : ""}`}>
                <Avatar
                  pictureUrl={meeting.organizerPictureUrl}
                  displayName={meeting.organizerDisplayName}
                  size="h-12 w-12"
                />
              </div>
              <span className="sr-only">
                {meeting.organizerDisplayName},{" "}
                {isCollecting
                  ? meeting.organizerHasSubmittedAvailability
                    ? "Submitted"
                    : "Pending"
                  : "Joined"}
              </span>
              {isCollecting ? (
                meeting.organizerHasSubmittedAvailability ? (
                  <span className="absolute bottom-0 right-0 bg-emerald-500 rounded-full border border-white p-0.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[10px] text-white block">check</span>
                  </span>
                ) : (
                  <span className="absolute bottom-0 right-0 bg-amber-500 rounded-full border border-white p-0.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[10px] text-white block">schedule</span>
                  </span>
                )
              ) : (
                <span className="absolute bottom-0 right-0 bg-emerald-500 rounded-full border border-white p-0.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-[10px] text-white block">check</span>
                </span>
              )}
            </div>
          )}
          {/* Invitee avatars */}
          {displayInvitees.slice(0, meeting.organizerDisplayName ? MAX_AVATARS - 1 : MAX_AVATARS).map((inv) => (
            <div key={inv.id} className="relative">
              <div className={`h-12 w-12 rounded-full ring-2 ring-white overflow-hidden ${isCollecting && !inv.hasSubmittedAvailability ? "opacity-50" : ""}`}>
                <Avatar
                  pictureUrl={inv.pictureUrl}
                  displayName={inv.displayName}
                  size="h-12 w-12"
                />
              </div>
              {isCollecting ? (
                inv.hasSubmittedAvailability ? (
                  <span className="absolute bottom-0 right-0 bg-emerald-500 rounded-full border border-white p-0.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[10px] text-white block">check</span>
                  </span>
                ) : (
                  <span className="absolute bottom-0 right-0 bg-amber-500 rounded-full border border-white p-0.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[10px] text-white block">schedule</span>
                  </span>
                )
              ) : (
                inv.status === "joined" && (
                  <span className="absolute bottom-0 right-0 bg-emerald-500 rounded-full border border-white p-0.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[10px] text-white block">check</span>
                  </span>
                )
              )}
            </div>
          ))}
          {displayInvitees.length > (meeting.organizerDisplayName ? MAX_AVATARS - 1 : MAX_AVATARS) && (
            <div className="h-12 w-12 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-500">
                +{displayInvitees.length - (meeting.organizerDisplayName ? MAX_AVATARS - 1 : MAX_AVATARS)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Parameters Card ---

function ParametersCard({ meeting }: { meeting: Meeting }) {
  const sortedDates = [...meeting.selectedDates].sort();

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#f98006]/10">
      <h3 className="font-bold mb-4">Original Parameters</h3>
      <div className="space-y-4">
        {/* Selected dates */}
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
            Selected Dates
          </span>
          <div className="flex flex-wrap gap-2">
            {sortedDates.map((d) => {
              const date = parse(d, "yyyy-MM-dd", new Date());
              return (
                <span
                  key={d}
                  className="bg-[#f98006]/10 text-[#f98006] px-3 py-1 rounded-full text-sm font-medium"
                >
                  {format(date, "MMM d")}
                </span>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {meeting.timeSlots.length > 0 && (
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
              Time Slots
            </span>
            <div className="flex flex-wrap gap-2">
              {meeting.timeSlots.map((slot) => (
                <span
                  key={`${slot.start}-${slot.end}`}
                  className="bg-[#f98006]/10 text-[#f98006] px-3 py-1 rounded-full text-sm font-medium"
                >
                  {slot.start} - {slot.end}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Duration */}
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
            Duration
          </span>
          <span className="bg-[#f98006]/10 text-[#f98006] px-3 py-1 rounded-full text-sm font-medium">
            {formatDuration(meeting.durationMinutes)}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Notes Card ---

function NotesCard({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#f98006]/10">
      <h3 className="font-bold mb-2">Additional Notes</h3>
      <p
        id="notes-content"
        className={`text-sm text-gray-600 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}
      >
        {notes}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="notes-content"
        className="mt-3 flex items-center text-[#f98006] text-sm font-bold"
      >
        {expanded ? "Show Less" : "View Full Notes"}
        <span aria-hidden="true" className="material-symbols-outlined text-sm ml-1">
          {expanded ? "expand_less" : "chevron_right"}
        </span>
      </button>
    </div>
  );
}

// --- Action Buttons ---

function ActionButtons({ meeting }: { meeting: Meeting }) {
  if (meeting.status === "cancelled") return null;

  if (meeting.status === "collecting") {
    return (
      <div className="pt-4 space-y-3">
        <Link
          href={`/meeting/${meeting.id}/availability`}
          className="w-full bg-[#f98006] hover:bg-[#d66c00] text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <span aria-hidden="true" className="material-symbols-outlined">edit_calendar</span>
          Submit Availability
        </Link>
      </div>
    );
  }

  if (meeting.status === "voting") {
    return (
      <div className="pt-4 space-y-3">
        <Link
          href={`/meeting/${meeting.id}/vote`}
          className="w-full bg-[#f98006] hover:bg-[#d66c00] text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <span aria-hidden="true" className="material-symbols-outlined">how_to_vote</span>
          Vote Now
        </Link>
      </div>
    );
  }

  if (meeting.status === "confirmed") {
    const calendarUrl = buildGoogleCalendarUrl(meeting);

    return (
      <div className="pt-4 space-y-3">
        {meeting.locationMode === "recommend" && (
          <Link
            href={`/meeting/${meeting.id}/venue`}
            className="w-full bg-[#f98006] hover:bg-[#d66c00] text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <span aria-hidden="true" className="material-symbols-outlined">auto_awesome</span>
            {meeting.venueRecommendations ? "View Venue Suggestions" : "AI Location Suggestions"}
          </Link>
        )}
        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <span aria-hidden="true" className="material-symbols-outlined">calendar_add_on</span>
            Add to Calendar
          </a>
        )}
      </div>
    );
  }

  return null;
}

function buildGoogleCalendarUrl(meeting: Meeting): string | null {
  if (!meeting.datetimeStart || !meeting.datetimeEnd) return null;

  const start = new Date(meeting.datetimeStart);
  const end = new Date(meeting.datetimeEnd);

  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meeting.title,
    dates: `${fmt(start)}/${fmt(end)}`,
  });

  if (meeting.location) {
    params.set("location", meeting.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// --- Main Content ---

function MeetingInfoContent({ meetingId }: { meetingId: string }) {
  const { isInitialized } = useLiff();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: () => api.getMeeting(meetingId),
    enabled: isInitialized,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 1,
  });

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f98006]" />
      </div>
    );
  }

  if (isError) {
    const is404 =
      (error instanceof ApiError && error.status === 404) ||
      (error instanceof Error && /not found/i.test(error.message));
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfaf6] px-6">
        <span className="material-symbols-outlined text-gray-300 text-6xl mb-4">
          {is404 ? "event_busy" : "cloud_off"}
        </span>
        <p className="text-gray-600 font-medium">
          {is404 ? "Meeting not found" : "Failed to load meeting"}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          {is404
            ? "This meeting may have been deleted."
            : "Please check your connection and try again."}
        </p>
      </div>
    );
  }

  const meeting = data?.data;
  if (!meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fdfaf6]">
        <p className="text-gray-500">Meeting not found.</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-[#fdfaf6] overflow-hidden">
      {/* Header */}
      <header className="bg-[#f98006] pt-12 pb-8 px-6 rounded-b-3xl shadow-lg">
        <h1 className="text-white text-lg font-bold text-center">
          Meeting Details
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 space-y-4 pb-8">
        <StatusBadge status={meeting.status} />
        <SummaryCard meeting={meeting} />
        <AttendeesCard meeting={meeting} />
        <ParametersCard meeting={meeting} />
        {meeting.notes && <NotesCard notes={meeting.notes} />}
        <ActionButtons meeting={meeting} />
      </main>
    </div>
  );
}

// --- Page Export ---

export default function MeetingInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  if (!id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfaf6] px-6">
        <p className="text-sm text-gray-500">Invalid meeting ID.</p>
      </div>
    );
  }

  return <MeetingInfoContent meetingId={id} />;
}
