"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Meeting, VenueResult, VenueRanking, MeetingTypeEnum } from "@/types/meeting";

// --- Refinement configs per meeting type ---

interface RefinementOption {
  key: string;
  emoji: string;
  label: string;
}

const MEAL_REFINEMENTS: RefinementOption[] = [
  { key: "balanced", emoji: "\u2696\ufe0f", label: "Balanced" },
  { key: "cheaper", emoji: "\ud83d\udcb0", label: "Budget" },
  { key: "better_food", emoji: "\ud83c\udf7d\ufe0f", label: "Best Food" },
  { key: "better_group_fit", emoji: "\ud83d\udc65", label: "Group Fit" },
  { key: "better_vibe", emoji: "\u2728", label: "Best Vibe" },
];

const CAFE_REFINEMENTS: RefinementOption[] = [
  { key: "balanced", emoji: "\u2696\ufe0f", label: "Balanced" },
  { key: "cheaper", emoji: "\ud83d\udcb0", label: "Budget" },
  { key: "better_food", emoji: "\ud83e\udeb6", label: "Best Brew" },
  { key: "better_vibe", emoji: "\u2728", label: "Cozy" },
];

function getRefinements(type: MeetingTypeEnum): RefinementOption[] {
  switch (type) {
    case "meals":
      return MEAL_REFINEMENTS;
    case "cafe":
      return CAFE_REFINEMENTS;
    default:
      return MEAL_REFINEMENTS;
  }
}

// --- Page ---

export default function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: meetingId } = use(params);
  const queryClient = useQueryClient();
  const [activeRefinement, setActiveRefinement] = useState("balanced");
  const [currentPage, setCurrentPage] = useState(0);

  // Fetch meeting details — same cache shape as the detail page (stores { data: Meeting })
  const {
    data: meetingData,
    isLoading: meetingLoading,
    isError: meetingIsError,
    error: meetingError,
  } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: () => api.getMeeting(meetingId),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 1,
  });

  const meeting = meetingData?.data;

  // Fetch venue recommendations
  const {
    data: venueResult,
    isLoading: venueLoading,
    error: venueError,
  } = useQuery({
    queryKey: ["venue", meetingId],
    queryFn: () => api.getVenueRecommendations(meetingId).then((r) => r.data),
    refetchInterval: (query) => {
      // Poll every 5s if results are pending (not ready yet)
      return query.state.data === null ? 5000 : false;
    },
  });

  // Refine mutation
  const refineMutation = useMutation({
    mutationFn: ({ refinement, page }: { refinement: string; page: number }) =>
      api.refineVenueRecommendations(meetingId, refinement, page).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(["venue", meetingId], data);
      setActiveRefinement(data.refinementUsed);
      setCurrentPage(data.currentPage);
    },
  });

  // Select venue mutation
  const selectMutation = useMutation({
    mutationFn: (venueName: string) => api.selectVenue(meetingId, venueName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
    },
  });

  // Fetch current user to check if they are the organizer
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe().then((r) => r.data),
  });

  // Sync local state from loaded/cached venue results
  const displayResult = refineMutation.data ?? venueResult;
  useEffect(() => {
    if (displayResult?.refinementUsed) {
      setActiveRefinement(displayResult.refinementUsed);
    }
    if (displayResult?.currentPage != null) {
      setCurrentPage(displayResult.currentPage);
    }
  }, [displayResult?.refinementUsed, displayResult?.currentPage]);

  const isCurrentUserOrganizer = currentUser && meeting && currentUser.id === meeting.organizerUserId;

  const refinements = meeting ? getRefinements(meeting.type) : MEAL_REFINEMENTS;
  const isRefining = refineMutation.isPending;
  const venueSelected = !!(meeting?.location && meeting.locationMode === "recommend" && meeting.location !== "");

  if (meetingLoading) {
    return <LoadingSkeleton />;
  }

  if (meetingIsError) {
    const is404 =
      (meetingError instanceof ApiError && meetingError.status === 404) ||
      (meetingError instanceof Error && /not found/i.test(meetingError.message));
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FCF9F5] px-6">
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

  if (!meeting) {
    return (
      <div className="min-h-screen bg-[#FCF9F5] flex items-center justify-center p-6">
        <p className="text-gray-500">Meeting not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCF9F5] pb-10">
      {/* Header */}
      <header className="bg-[#f98006] px-6 pt-12 pb-8 rounded-b-3xl shadow-lg relative z-10">
        <h1 className="text-white text-lg font-bold mb-1">AI Location Suggestions</h1>
        <h2 className="text-white text-2xl font-bold leading-tight mb-3">{meeting.title}</h2>
        <div className="flex items-center gap-4 text-white">
          <InfoBadge label="Type" value={meeting.type} />
          <div className="h-6 w-[1px] bg-white opacity-30" />
          <InfoBadge label="Duration" value={`${meeting.durationMinutes} min`} />
          {meeting.location && (
            <>
              <div className="h-6 w-[1px] bg-white opacity-30" />
              <InfoBadge label="Area" value={meeting.location} />
            </>
          )}
        </div>
      </header>

      {/* Refine Controls */}
      <section className="mt-4 px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#FF8C00]">
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
            <span className="text-sm font-bold text-gray-800">Refine Suggestions</span>
          </div>
          <button
            onClick={() => {
              const totalPages = displayResult?.totalPages ?? 1;
              const nextPage = Math.min(currentPage + 1, totalPages - 1);
              setCurrentPage(nextPage);
              refineMutation.mutate({ refinement: activeRefinement, page: nextPage });
            }}
            disabled={isRefining || currentPage >= (displayResult?.totalPages ?? 1) - 1}
            className="flex items-center gap-1.5 bg-[#FF8C00]/10 text-[#FF8C00] px-3 py-1.5 rounded-full text-xs font-bold transition-colors active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            {currentPage < (displayResult?.totalPages ?? 1) - 1 ? "More" : "No More"}
          </button>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
          {refinements.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setActiveRefinement(r.key);
                setCurrentPage(0);
                refineMutation.mutate({ refinement: r.key, page: 0 });
              }}
              disabled={isRefining}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-transform text-xs font-medium disabled:opacity-50 ${
                activeRefinement === r.key
                  ? "bg-[#FF8C00] text-white border border-[#FF8C00]"
                  : "bg-white text-gray-600 border border-gray-100"
              }`}
            >
              <span className="text-base">{r.emoji}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Venue Cards */}
      <main className="px-6 mt-4 relative z-20 space-y-4">
        {(venueLoading || isRefining) && !displayResult ? (
          <VenueCardsSkeleton />
        ) : venueResult === null ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-[#FF8C00] mb-2 block">hourglass_top</span>
            <p className="text-gray-600 text-sm">Generating venue recommendations...</p>
            <p className="text-gray-400 text-xs mt-1">This may take 10-30 seconds</p>
          </div>
        ) : venueError ? (
          <div className="bg-white rounded-3xl shadow-sm border border-red-100 p-6 text-center">
            <p className="text-red-600 text-sm">Failed to load recommendations</p>
          </div>
        ) : displayResult && displayResult.rankings.length > 0 ? (
          <>
            {isRefining && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Finding new suggestions...</span>
              </div>
            )}
            {displayResult.rankings.map((venue) => (
              <VenueCard
                key={`${venue.rank}-${venue.name}`}
                venue={venue}
                isOrganizer={!!isCurrentUserOrganizer}
                onSelect={() => selectMutation.mutate(venue.name)}
                isSelecting={selectMutation.isPending}
                isSelected={meeting.location === venue.name && venueSelected}
              />
            ))}
            {displayResult.totalPages > 1 && (
              <p className="text-xs text-gray-400 text-center">
                Page {displayResult.currentPage + 1} of {displayResult.totalPages}
              </p>
            )}
            {displayResult.suggestion && (
              <p className="text-xs text-gray-400 text-center italic px-4">
                {displayResult.suggestion}
              </p>
            )}
          </>
        ) : displayResult ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">search_off</span>
            <p className="text-gray-600 text-sm">No venues found for this criteria</p>
            {displayResult.suggestion && (
              <p className="text-gray-400 text-xs mt-1">{displayResult.suggestion}</p>
            )}
          </div>
        ) : null}

        {selectMutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-green-700 text-sm font-medium">Venue selected! The group has been notified.</p>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Components ---

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider font-bold opacity-70">{label}</span>
      <span className="text-[13px] font-medium capitalize">{value}</span>
    </div>
  );
}

function VenueCard({
  venue,
  isOrganizer,
  onSelect,
  isSelecting,
  isSelected,
}: {
  venue: VenueRanking;
  isOrganizer: boolean;
  onSelect: () => void;
  isSelecting: boolean;
  isSelected?: boolean;
}) {
  return (
    <article className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-gray-800">{venue.name}</h3>
          <span className="bg-orange-50 text-[#FF8C00] text-[10px] font-bold px-2 py-0.5 rounded-full">
            ★ {venue.rating.toFixed(1)}
          </span>
        </div>

        {/* Rationale quote */}
        <div className="bg-orange-50 border-l-4 border-[#FF8C00] p-2 rounded-r-lg mb-2">
          <p className="text-[11px] text-orange-800 leading-tight italic">
            &ldquo;{venue.rationale}&rdquo;
          </p>
        </div>

        {/* Details row */}
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-1">
          {venue.priceLabel && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-gray-400">payments</span>
              {venue.priceLabel}
            </span>
          )}
          {venue.distanceKm !== undefined && venue.distanceKm > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-gray-400">location_on</span>
              {venue.distanceKm.toFixed(1)} km
            </span>
          )}
          {venue.vegetarianFriendly && (
            <span className="flex items-center gap-1">
              <span className="text-green-500 text-sm">🌱</span>
              Veg friendly
            </span>
          )}
        </div>

        {/* Highlights */}
        {venue.highlights && venue.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 mt-2">
            {venue.highlights.map((h, i) => (
              <span
                key={i}
                className="bg-gray-50 text-gray-600 text-[10px] px-2 py-0.5 rounded-full border border-gray-100"
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Concerns */}
        {venue.concerns && venue.concerns.length > 0 && (
          <div className="mb-3">
            {venue.concerns.map((c, i) => (
              <p key={i} className="text-[10px] text-gray-400 flex items-start gap-1">
                <span className="text-amber-400 mt-0.5">⚠</span>
                {c}
              </p>
            ))}
          </div>
        )}

        {/* Select button (organizer only) */}
        {isOrganizer && (
          <button
            onClick={onSelect}
            disabled={isSelecting || isSelected}
            className={`w-full text-sm font-bold py-2 rounded-xl shadow-sm transition-colors ${
              isSelected
                ? "bg-green-500 text-white"
                : "bg-[#FF8C00] text-white active:scale-95"
            } disabled:opacity-70`}
          >
            {isSelected ? "✓ Selected" : isSelecting ? "Selecting..." : "Select Location"}
          </button>
        )}
      </div>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FCF9F5]">
      <div className="bg-[#f98006] px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="h-5 w-48 bg-white/30 rounded mb-2 animate-pulse" />
        <div className="h-8 w-64 bg-white/30 rounded mb-3 animate-pulse" />
        <div className="flex gap-4">
          <div className="h-10 w-16 bg-white/20 rounded animate-pulse" />
          <div className="h-10 w-16 bg-white/20 rounded animate-pulse" />
          <div className="h-10 w-16 bg-white/20 rounded animate-pulse" />
        </div>
      </div>
      <div className="px-6 mt-6">
        <VenueCardsSkeleton />
      </div>
    </div>
  );
}

function VenueCardsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between mb-3">
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-12 bg-orange-50 rounded-full animate-pulse" />
          </div>
          <div className="h-12 bg-orange-50 rounded-lg mb-3 animate-pulse" />
          <div className="h-3 w-32 bg-gray-100 rounded mb-3 animate-pulse" />
          <div className="h-9 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  );
}
