"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

function AvailabilityContent({ meetingId }: { meetingId: string }) {
  const searchParams = useSearchParams();
  const googleError = searchParams.get("google_error");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: () => api.getMeeting(meetingId),
  });

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const res = await api.getGoogleAuthUrl(meetingId);
      window.location.href = res.data.authUrl;
    } catch (err) {
      console.error("[AvailabilityPage] Failed to get Google auth URL:", err);
      setConnectError("Failed to start Google sign-in. Please try again.");
      setIsConnecting(false);
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
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">
              Failed to connect Google Calendar. Please try again.
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Connect Google Calendar
            </h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              AI will instantly find your free times
            </p>
            <button
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isConnecting ? "Connecting..." : "Connect Now"}
            </button>
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
            <button className="w-full border-2 border-primary text-primary hover:bg-primary/5 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2">
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
