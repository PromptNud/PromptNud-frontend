"use client";

import { use, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import liff from "@line/liff";
import { useLiff } from "@/hooks/useLiff";
import { api, ApiError } from "@/lib/api";

function AvailabilityContent({ meetingId }: { meetingId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const googleError = searchParams.get("google_error");
  const { isInitialized, user } = useLiff();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const joiningRef = useRef(false);

  // Auto-join meeting to link LINE user to invitee record
  useEffect(() => {
    if (!user || hasJoined || joiningRef.current) return;
    joiningRef.current = true;
    api
      .joinMeeting(meetingId, user.userId, user.displayName)
      .then(() => {
        setHasJoined(true);
      })
      .catch((err) => {
        // "already joined" means we're linked — treat as success
        if (err instanceof Error && /already joined/i.test(err.message)) {
          setHasJoined(true);
        }
        // Transient failure: allow retry on next render
        joiningRef.current = false;
      });
  }, [user, meetingId, hasJoined]);

  const { data: meData, error: meError, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe(),
    enabled: isInitialized,
  });

  const hasGoogleCalendar = meData?.data?.hasGoogleCalendar ?? false;
  const isCheckingCalendarStatus = !isInitialized || meLoading;
  const meReady = !isCheckingCalendarStatus && !meError;
  const showSyncButton = meReady && hasGoogleCalendar && !needsReconnect;
  const showConnectButton = meReady && (!hasGoogleCalendar || needsReconnect);

  const { data, isLoading, error } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: () => api.getMeeting(meetingId),
  });

  const handleConnectGoogle = async () => {
    if (!isInitialized) {
      setConnectError("LIFF is not ready yet. Please wait and try again.");
      return;
    }

    setIsConnecting(true);
    setConnectError(null);
    try {
      const res = await api.getGoogleAuthUrl(meetingId);
      liff.openWindow({ url: res.data.authUrl, external: true });
      setIsConnecting(false);
    } catch (err) {
      console.error("[AvailabilityPage] Failed to get Google auth URL:", err);
      setConnectError("Failed to start Google sign-in. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncing(true);
    setConnectError(null);
    try {
      const res = await api.syncGoogleCalendar(meetingId);
      const busySlots = res.data?.busy_slots ?? [];
      // Store busy slots in sessionStorage for the grid page
      sessionStorage.setItem(
        `busySlots_${meetingId}`,
        JSON.stringify(busySlots)
      );
      router.push(`/meeting/${meetingId}/availability/select?mode=calendar`);
    } catch (err) {
      console.error("[AvailabilityPage] Sync failed:", err);
      if (err instanceof ApiError && err.status === 422) {
        setNeedsReconnect(true);
      } else {
        setConnectError("Failed to sync calendar. Please try again.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const meeting = data?.data;

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
    console.error("[AvailabilityPage] Failed to load meeting:", error);
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

  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-bg-light overflow-hidden">
      {/* Header */}
      <header className="bg-primary px-6 pt-12 pb-8 rounded-b-3xl shadow-lg text-white">
        <div className="text-center">
          <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">
            Meeting Name
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {meeting.title}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pt-10 pb-12 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">
          When are you free?
        </h2>

        <div className="w-full space-y-6">
          {googleError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
              Google Calendar connection failed. Please try again.
            </div>
          )}

          {/* Google Calendar Card */}
          <div className="bg-surface-light border-2 border-primary rounded-3xl p-6 flex flex-col items-center text-center shadow-xl shadow-primary/5">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <span
                className="material-symbols-outlined text-primary text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                calendar_month
              </span>
            </div>

            {isCheckingCalendarStatus && (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Google Calendar
                </h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Checking connection status...
                </p>
                <div className="w-full flex justify-center py-3.5">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              </>
            )}

            {!isCheckingCalendarStatus && meError && (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Google Calendar
                </h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Unable to check calendar status. Please reload the page.
                </p>
              </>
            )}

            {showSyncButton && (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Google Calendar Connected
                </h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Sync your calendar to find free times
                </p>
                <button
                  onClick={handleSyncCalendar}
                  disabled={isSyncing}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSyncing ? "Syncing..." : "Sync Calendar"}
                </button>
              </>
            )}

            {showConnectButton && (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {needsReconnect ? "Reconnect Google Calendar" : "Connect Google Calendar"}
                </h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  {needsReconnect
                    ? "Your previous connection expired. Please reconnect."
                    : "AI will instantly find your free times"}
                </p>
                <button
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isConnecting ? "Connecting..." : needsReconnect ? "Reconnect" : "Connect Now"}
                </button>
              </>
            )}

            {connectError && (
              <p className="text-red-500 text-sm text-center mt-2">{connectError}</p>
            )}
          </div>

          {/* Manual Selection Card */}
          <div className="bg-surface-light border-2 border-primary/40 rounded-3xl p-6 flex flex-col items-center text-center shadow-lg shadow-black/5">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-gray-600 text-4xl">
                edit_calendar
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Select Manually
            </h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Pick days and times yourself
            </p>
            <button
              onClick={() => router.push(`/meeting/${meetingId}/availability/select?mode=manual`)}
              className="w-full border-2 border-primary text-primary hover:bg-primary/5 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              Choose Times
            </button>
          </div>
        </div>
      </main>

    </div>
  );
}

export default function AvailabilityPage({
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

  return <AvailabilityContent meetingId={id} />;
}
