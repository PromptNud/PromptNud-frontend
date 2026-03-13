"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useLiff } from "@/hooks/useLiff";
import { api } from "@/lib/api";
import type {
  MeetingListItem,
  MeetingStatus,
  MeetingFilterTab,
  MeetingTypeEnum,
  LocationMode,
} from "@/types/meeting";

// --- Status badge config ---

const STATUS_BADGE: Record<
  MeetingStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  collecting: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Collecting",
  },
  voting: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
    label: "Voting",
  },
  confirmed: {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
    label: "Confirmed",
  },
  cancelled: {
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Cancelled",
  },
};

// --- Meeting type icons (Material Symbols Outlined names) ---

const TYPE_ICON: Record<MeetingTypeEnum, { icon: string; label: string }> = {
  meals: { icon: "restaurant", label: "Meals" },
  cafe: { icon: "local_cafe", label: "Cafe" },
  sports: { icon: "sports_soccer", label: "Sports" },
  others: { icon: "more_horiz", label: "Others" },
};

// --- Location display ---

function locationDisplay(mode: LocationMode, location?: string) {
  switch (mode) {
    case "specify":
      return { icon: "location_on", text: location || "Specified" };
    case "decide_later":
      return { icon: "location_off", text: "Decide Later" };
    case "recommend":
      return { icon: "explore", text: "Recommendation" };
  }
}

// --- Duration formatting ---

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${hours} hours`;
}

// --- "Past" check: all selected dates < today (Bangkok) ---

function isMeetingPast(meeting: MeetingListItem): boolean {
  const now = new Date();
  // Bangkok is UTC+7
  const bangkokOffset = 7 * 60;
  const utcMinutes = now.getTime() / 60000 + now.getTimezoneOffset();
  const bangkokDate = new Date((utcMinutes + bangkokOffset) * 60000);
  const todayStr = bangkokDate.toISOString().slice(0, 10);

  return meeting.selectedDates.every((d) => d < todayStr);
}

// --- Filter logic ---

const TABS: { key: MeetingFilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "past", label: "Past" },
];

function filterMeetings(
  meetings: MeetingListItem[],
  tab: MeetingFilterTab
): MeetingListItem[] {
  switch (tab) {
    case "all":
      return meetings;
    case "active":
      return meetings.filter(
        (m) => m.status === "collecting" || m.status === "voting"
      );
    case "confirmed":
      return meetings.filter(
        (m) => m.status === "confirmed" && !isMeetingPast(m)
      );
    case "cancelled":
      return meetings.filter((m) => m.status === "cancelled");
    case "past":
      return meetings.filter(
        (m) => m.status === "confirmed" && isMeetingPast(m)
      );
  }
}

// --- Empty state messages ---

const EMPTY_MESSAGES: Record<MeetingFilterTab, string> = {
  all: "No meetings yet. Create one to get started!",
  active: "No active meetings right now.",
  confirmed: "No confirmed upcoming meetings.",
  cancelled: "No cancelled meetings.",
  past: "No past meetings.",
};

// --- Components ---

function StatusBadge({ status }: { status: MeetingStatus }) {
  const badge = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${badge.bg} ${badge.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1.5`} />
      {badge.label}
    </span>
  );
}

function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  const typeInfo = TYPE_ICON[meeting.type] || TYPE_ICON.others;
  const loc = locationDisplay(meeting.locationMode, meeting.location);
  const updatedAgo = formatDistanceToNow(new Date(meeting.updatedAt), {
    addSuffix: true,
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="p-4 pb-3">
        {/* Status + timestamp */}
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={meeting.status} />
          <span className="text-xs text-gray-500 font-medium">
            Updated {updatedAgo}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-4 line-clamp-1">
          {meeting.title}
        </h3>

        {/* Details row */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">
              {typeInfo.icon}
            </span>
            <span>{typeInfo.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">
              schedule
            </span>
            <span>{formatDuration(meeting.durationMinutes)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">
              {loc.icon}
            </span>
            <span>{loc.text}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50 p-3 flex justify-end">
        <Link
          href={`/meeting/${meeting.id}`}
          className="text-[#f98006] text-sm font-semibold flex items-center gap-1 hover:text-[#d66c00] transition-colors"
        >
          View Details
          <span className="material-symbols-outlined text-[16px]">
            chevron_right
          </span>
        </Link>
      </div>
    </div>
  );
}

function MeetingsContent() {
  const searchParams = useSearchParams();
  const { isInitialized } = useLiff();
  const [activeTab, setActiveTab] = useState<MeetingFilterTab>("all");

  const groupId = searchParams.get("groupId");

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings", "group", groupId],
    queryFn: async () => {
      const res = await api.getMeetingsByGroup(groupId!);
      return res.data;
    },
    enabled: !!groupId && isInitialized,
  });

  const filtered = useMemo(
    () => filterMeetings(meetings, activeTab),
    [meetings, activeTab]
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!groupId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fdfaf6]">
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-gray-300 text-6xl mb-4 block">
            group_off
          </span>
          <p className="text-gray-500 text-lg font-medium">
            No group ID provided
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Open this page from a LINE group chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-[#fdfaf6] overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#f98006] to-[#ff9e3d] px-6 pt-12 pb-6 rounded-b-3xl shadow-lg relative z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-2xl font-bold">Group Meetings</h1>
          <p className="text-white/80 text-sm">
            Manage all your scheduled events
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-4 px-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-none h-10 px-5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-[#f98006]/10 text-[#f98006] font-bold border border-[#f98006]/20 shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        )}

        {/* Meeting cards */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-gray-300 text-5xl mb-4">
              event_busy
            </span>
            <p className="text-gray-500 font-medium">
              {EMPTY_MESSAGES[activeTab]}
            </p>
          </div>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
        <Link
          href={`/create?groupId=${groupId}`}
          className="bg-[#f98006] hover:bg-[#d66c00] text-white rounded-full p-4 shadow-lg transition-colors flex items-center justify-center border-4 border-[#fdfaf6]"
        >
          <span className="material-symbols-outlined block text-[28px]">
            add
          </span>
        </Link>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      }
    >
      <MeetingsContent />
    </Suspense>
  );
}
