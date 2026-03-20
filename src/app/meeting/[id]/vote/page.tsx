"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiff } from "@/hooks/useLiff";
import { api, ApiError } from "@/lib/api";
import { format, parse } from "date-fns";
import liff from "@line/liff";

function Avatar({ pictureUrl, displayName }: { pictureUrl?: string; displayName: string }) {
  const [imgError, setImgError] = useState(false);

  if (!pictureUrl || imgError) {
    return <div className="w-full h-full bg-gray-300" />;
  }

  return (
    <img
      src={pictureUrl}
      alt={displayName}
      className="w-full h-full object-cover"
      onError={() => setImgError(true)}
    />
  );
}

function AvailabilityAvatars({
  invitees,
  missingPersons,
}: {
  invitees: NonNullable<import("@/types/meeting").Meeting["invitees"]>;
  missingPersons?: string[];
}) {
  const missing = new Set(missingPersons ?? []);
  const available = invitees.filter((inv) => !missing.has(inv.lineUserId));

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className="flex -space-x-1.5">
        {available.slice(0, 5).map((inv) => (
          <div
            key={inv.lineUserId}
            className="w-5 h-5 rounded-full border border-white overflow-hidden bg-gray-200 flex-shrink-0"
          >
            <Avatar pictureUrl={inv.pictureUrl} displayName={inv.displayName} />
          </div>
        ))}
        {available.length > 5 && (
          <div className="w-5 h-5 rounded-full border border-white bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-[8px] text-gray-500 font-medium">
              +{available.length - 5}
            </span>
          </div>
        )}
      </div>
      <span className="text-xs text-gray-400">
        {available.length}/{invitees.length} available
      </span>
    </div>
  );
}

function VoteContent({ meetingId }: { meetingId: string }) {
  const { isInitialized, user } = useLiff();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const joiningRef = useRef(false);
  const joinAttemptsRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_JOIN_RETRIES = 3;

  // Auto-join meeting to link LINE user to invitee record
  useEffect(() => {
    if (!user || hasJoined || joiningRef.current || joinAttemptsRef.current >= MAX_JOIN_RETRIES) return;
    joiningRef.current = true;
    joinAttemptsRef.current += 1;
    api
      .joinMeeting(meetingId, user.userId, user.displayName, user.pictureUrl)
      .then(() => {
        setHasJoined(true);
        setJoinError(null);
        queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      })
      .catch((err) => {
        if (err instanceof Error && /already joined/i.test(err.message)) {
          setHasJoined(true);
          setJoinError(null);
        } else if (joinAttemptsRef.current >= MAX_JOIN_RETRIES) {
          setJoinError("Failed to join meeting. Please try again later.");
        } else {
          joiningRef.current = false;
        }
      });
  }, [user, meetingId, hasJoined]);

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: () => api.getMeeting(meetingId),
    enabled: isInitialized,
  });

  const meeting = data?.data;
  const rankings = meeting?.rankings ?? [];

  // Pre-select from existing vote
  const existingVoteLoaded = useRef(false);
  useEffect(() => {
    if (!meeting || !user || existingVoteLoaded.current) return;
    existingVoteLoaded.current = true;

    api
      .getVoteSummary(meetingId)
      .then((res) => {
        // Find which slots this user voted for by checking voterIds
        const votedIndices = new Set<number>();
        for (const slot of res.data.slots) {
          if (slot.voterIds.includes(user.userId)) {
            votedIndices.add(slot.rank);
          }
        }
        if (votedIndices.size > 0) {
          setSelected(votedIndices);
        }
      })
      .catch((err) => {
        console.error("[VotePage] Failed to load existing votes for pre-selection:", err);
      });
  }, [meeting, user, meetingId]);

  const toggleSelection = (rank: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) {
        next.delete(rank);
      } else {
        next.add(rank);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.submitVote(meetingId, Array.from(selected));
      setSubmitSuccess(true);

      // Auto-close LIFF after short delay
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        if (liff.isInClient()) {
          liff.closeWindow();
        }
      }, 1500);
    } catch (err) {
      console.error("[VotePage] Failed to submit vote:", err);
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Failed to submit vote. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-light">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "";
    const isNotFound = message.includes("404") || /not found/i.test(message);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-light px-6">
        <p className="text-sm text-gray-500">
          {isNotFound ? "Meeting not found." : "Unable to load meeting."}
        </p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-light px-6">
        <p className="text-sm text-gray-500">Meeting not found.</p>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-light px-6">
        <p className="text-sm text-gray-500">No ranked time slots available for voting.</p>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-light px-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Vote Submitted!</h2>
        <p className="text-sm text-gray-500">Your vote has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-bg-light overflow-hidden">
      {/* Header */}
      <header className="bg-primary px-6 pt-12 pb-8 rounded-b-3xl shadow-lg text-white">
        <div className="text-center">
          <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">
            Vote
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {meeting.title}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pt-8 pb-28">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            Confirm Your Availability
          </h2>
          <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
            {rankings.length} Options
          </span>
        </div>

        {joinError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
            {joinError}
          </div>
        )}

        <div className="space-y-4">
          {rankings.map((ranking) => {
            const isSelected = selected.has(ranking.rank);
            return (
              <button
                key={ranking.rank}
                type="button"
                onClick={() => toggleSelection(ranking.rank)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Rank Badge */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <span className="text-sm font-bold">#{ranking.rank}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">
                      {formatDate(ranking.date)}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {ranking.startTime} - {ranking.endTime}
                    </p>
                    <AvailabilityAvatars
                      invitees={meeting.invitees ?? []}
                      missingPersons={ranking.missingPersons}
                    />
                  </div>

                  {/* Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined text-white text-sm">
                        check
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {submitError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </main>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 z-10">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0 || isSubmitting}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Submitting..."
              : selected.size === 0
                ? "Select at least one option"
                : `Confirm (${selected.size} selected)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  if (!id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-light px-6">
        <p className="text-sm text-gray-500">Invalid meeting ID.</p>
      </div>
    );
  }

  return <VoteContent meetingId={id} />;
}
