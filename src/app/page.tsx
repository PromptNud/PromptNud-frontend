"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import liff from "@line/liff";
import { useLiff } from "@/hooks/useLiff";
import { PageHeader } from "@/components/common/PageHeader";

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
      router.push(`/create${urlGroupId ? `?groupId=${urlGroupId}` : ""}`);
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
    <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-[#fdfaf6] overflow-hidden">
      <PageHeader title="Meeting Scheduler" subtitle="Promptnud">
        {user && (
          <div className="flex items-center justify-center gap-3 mt-4">
            {user.pictureUrl && (
              <img
                src={user.pictureUrl}
                alt={user.displayName}
                className="w-10 h-10 rounded-full border-2 border-white/30"
              />
            )}
            <span className="text-white/90 text-sm font-medium">
              {user.displayName}
            </span>
          </div>
        )}
      </PageHeader>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24">

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
      </main>
    </div>
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
