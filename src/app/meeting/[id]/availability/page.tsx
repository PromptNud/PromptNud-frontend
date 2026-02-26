"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function AvailabilityPage() {
  const params = useParams();
  const rawId = params.id;
  const meetingId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!meetingId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
        <p className="text-sm text-gray-500">Invalid meeting ID.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl">🗓️</div>
        <h1 className="mb-2 text-xl font-bold text-gray-900">
          Choose Your Availability
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          This feature is coming soon. You&apos;ll be able to select the times
          that work for you so the group can find the best meeting time.
        </p>
        <div className="mb-6 rounded-lg bg-gray-100 px-4 py-3">
          <p className="text-xs text-gray-400">Meeting ID</p>
          <p className="font-mono text-sm text-gray-600">{meetingId}</p>
        </div>
        <Link
          href="/"
          className="inline-block rounded-full bg-[#F98006] hover:bg-orange-600 px-6 py-2.5 text-sm font-medium text-white transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
