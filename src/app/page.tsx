"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import liff from "@line/liff";
import { useLiff } from "@/hooks/useLiff";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized, isInClient } = useLiff();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [contextType, setContextType] = useState<string>("");

  useEffect(() => {
    if (!isInitialized) return;

    // Get groupId from URL params (provided by LINE bot webhook link)
    const urlGroupId = searchParams.get("groupId");
    const context = liff.getContext();

    setGroupId(urlGroupId || null);
    setContextType(context?.type || "none");

    // Handle action param
    const action = searchParams.get("action");
    if (action === "create") {
      router.push("/create");
    }
  }, [searchParams, router, isInitialized]);

  const handleCreateMeeting = () => {
    router.push(`/create${groupId ? `?groupId=${groupId}` : ""}`);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-4">
        <header className="text-center py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            📅 Meeting Scheduler
          </h1>
          {user ? (
            <div className="mt-4">
              {user.pictureUrl && (
                <img
                  src={user.pictureUrl}
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full mx-auto mb-2"
                />
              )}
              <p className="text-gray-600 text-lg font-medium">
                Welcome, {user.displayName}!
              </p>
              <p className="text-gray-500 text-sm mt-1">
                User ID: {user.userId}
              </p>
            </div>
          ) : (
            <p className="text-gray-600 mt-2">Not logged in</p>
          )}
        </header>

        {/* LIFF Connection Status */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-bold text-gray-900 mb-3">🔌 LIFF Connection Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">LIFF Initialized:</span>
              <span className={isInitialized ? "text-green-600 font-medium" : "text-red-600"}>
                {isInitialized ? "✓ Yes" : "✗ No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Running in LINE:</span>
              <span className={isInClient ? "text-green-600 font-medium" : "text-yellow-600"}>
                {isInClient ? "✓ Yes" : "⚠ External Browser"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User Logged In:</span>
              <span className={user ? "text-green-600 font-medium" : "text-red-600"}>
                {user ? "✓ Yes" : "✗ No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Context Type:</span>
              <span className="text-gray-900 font-medium">
                {contextType || "none"}
              </span>
            </div>
            {groupId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Group ID:</span>
                <span className="text-gray-900 font-mono text-xs">
                  {groupId.slice(0, 20)}...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>ℹ️ Testing LIFF Connection:</strong><br/>
            {!isInClient && (
              <span>
                You are viewing this in an external browser. For full LIFF features,
                open this URL in the LINE app.
              </span>
            )}
            {isInClient && !groupId && (
              <span>
                Open this app from a LINE group chat to test group functionality.
              </span>
            )}
            {isInClient && groupId && (
              <span>
                ✓ Successfully connected from LINE group chat!
              </span>
            )}
          </p>
        </div>

        <button
          onClick={handleCreateMeeting}
          className="w-full mb-6 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          + Create New Meeting (Demo)
        </button>

        {!isInClient && (
          <div className="text-center text-gray-500 py-8 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="font-medium">⚠️ Not running in LINE app</p>
            <p className="text-sm mt-2">
              To test the full LIFF integration, open this URL in the LINE app.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
