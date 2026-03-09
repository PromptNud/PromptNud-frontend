"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format, parse, getDay, getISOWeek } from "date-fns";
import { api, ApiError } from "@/lib/api";
import type { AvailableSlot, BusySlot } from "@/types/meeting";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Generate hourly slots from time slots, e.g. [{start:"09:00",end:"13:00"}] => ["09:00","10:00","11:00","12:00"] */
function generateHours(timeSlots: { start: string; end: string }[]): string[] {
  const hourSet = new Set<string>();
  for (const slot of timeSlots) {
    const startH = parseInt(slot.start.split(":")[0], 10);
    const endH = parseInt(slot.end.split(":")[0], 10);
    for (let h = startH; h < endH; h++) {
      hourSet.add(h.toString().padStart(2, "0") + ":00");
    }
  }
  return Array.from(hourSet).sort();
}

/** Group dates into calendar weeks */
function groupByWeek(dates: string[]): string[][] {
  const sorted = [...dates].sort();
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  let currentWeekNum: number | null = null;

  for (const d of sorted) {
    const parsed = parse(d, "yyyy-MM-dd", new Date());
    const weekNum = getISOWeek(parsed);
    if (currentWeekNum !== null && weekNum !== currentWeekNum) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeekNum = weekNum;
    currentWeek.push(d);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);
  return weeks;
}

/** Check if a given date+hour cell overlaps with any busy slot */
function isBusyAt(date: string, hour: string, busySlots: BusySlot[]): boolean {
  // Cell represents [date hour, date hour+1) in Bangkok time
  // Use explicit +07:00 offset so it's correct regardless of browser timezone
  const cellStart = new Date(`${date}T${hour}:00+07:00`);
  const cellEnd = new Date(cellStart.getTime() + 3600000);

  for (const busy of busySlots) {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);
    if (cellStart < busyEnd && cellEnd > busyStart) {
      return true;
    }
  }
  return false;
}

function SelectContent({ meetingId }: { meetingId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "manual";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const sourceRef = useRef<"manual" | "calendar">(mode === "calendar" ? "calendar" : "manual");

  // Touch drag state
  const isDragging = useRef(false);
  const dragMode = useRef<"select" | "deselect">("select");

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe(),
  });

  const hasGoogleCalendar = meData?.data?.hasGoogleCalendar ?? false;

  const { data, isLoading, error } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: () => api.getMeeting(meetingId),
  });

  const meeting = data?.data;
  const hours = meeting ? generateHours(meeting.timeSlots ?? []) : [];
  const weeks = meeting ? groupByWeek(meeting.selectedDates ?? []) : [];
  const currentDates = weeks[activeWeek] ?? [];

  // Initialize grid based on mode
  useEffect(() => {
    if (!meeting || initialized) return;

    if (mode === "calendar") {
      // Pre-fill from calendar: select non-busy cells only when cached data exists
      const raw = sessionStorage.getItem(`busySlots_${meetingId}`);
      if (raw !== null) {
        try {
          const busySlots: BusySlot[] = JSON.parse(raw);
          const allDates = meeting.selectedDates ?? [];
          const allHours = generateHours(meeting.timeSlots ?? []);
          const pre = new Set<string>();
          for (const date of allDates) {
            for (const hour of allHours) {
              if (!isBusyAt(date, hour, busySlots)) {
                pre.add(`${date}|${hour}`);
              }
            }
          }
          setSelected(pre);
        } catch (e) {
          console.warn("[SelectPage] Failed to parse busySlots from sessionStorage:", e);
          sessionStorage.removeItem(`busySlots_${meetingId}`);
        }
      }
      setInitialized(true);
    } else {
      // Manual mode: load previously saved availability
      api
        .getUserAvailability(meetingId)
        .then((res) => {
          if (res.data?.availableSlots) {
            const prev = new Set<string>();
            for (const s of res.data.availableSlots) {
              prev.add(`${s.date}|${s.hour}`);
            }
            setSelected(prev);
          }
        })
        .catch((err) => {
          console.error("[SelectPage] Failed to load availability:", err);
          setLoadError("Failed to load saved availability.");
        })
        .finally(() => setInitialized(true));
    }
  }, [meeting, meetingId, mode, initialized]);

  const setCell = useCallback((key: string, value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const handlePointerDown = useCallback(
    (key: string) => {
      isDragging.current = true;
      const willSelect = !selected.has(key);
      dragMode.current = willSelect ? "select" : "deselect";
      setCell(key, willSelect);
    },
    [selected, setCell]
  );

  const handlePointerEnter = useCallback(
    (key: string) => {
      if (!isDragging.current) return;
      setCell(key, dragMode.current === "select");
    },
    [setCell]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Global pointer up listener
  useEffect(() => {
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerUp]);

  const handleSelectAll = () => {
    const allDates = meeting?.selectedDates ?? [];
    const allHours = generateHours(meeting?.timeSlots ?? []);
    const all = new Set<string>();
    for (const d of allDates) {
      for (const h of allHours) {
        all.add(`${d}|${h}`);
      }
    }
    setSelected(all);
  };

  const handleClearAll = () => {
    setSelected(new Set());
  };

  const handleSyncCalendar = async () => {
    setIsSyncingCalendar(true);
    setSyncError(null);
    try {
      const res = await api.syncGoogleCalendar(meetingId);
      const busySlots: BusySlot[] = res.data?.busySlots ?? [];
      const allDates = meeting?.selectedDates ?? [];
      const allHours = generateHours(meeting?.timeSlots ?? []);
      const pre = new Set<string>();
      for (const date of allDates) {
        for (const hour of allHours) {
          if (!isBusyAt(date, hour, busySlots)) {
            pre.add(`${date}|${hour}`);
          }
        }
      }
      setSelected(pre);
      sourceRef.current = "calendar";
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setSyncError("Calendar access was revoked. Please reconnect Google Calendar.");
      } else {
        setSyncError("Failed to sync calendar. Please try again.");
      }
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const slots: AvailableSlot[] = Array.from(selected).map((key) => {
        const [date, hour] = key.split("|");
        return { date, hour };
      });
      await api.submitAvailability(meetingId, slots, sourceRef.current);
      sessionStorage.removeItem(`busySlots_${meetingId}`);
      router.push(`/meeting/${meetingId}/availability`);
    } catch (err) {
      console.error("[SelectPage] Submit failed:", err);
      alert("Failed to submit availability. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-light">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-light px-6">
        <p className="text-sm text-gray-500">Unable to load meeting.</p>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-bg-light overflow-hidden"
      onPointerUp={handlePointerUp}
    >
      {/* Header */}
      <header className="bg-primary px-6 pt-12 pb-8 rounded-b-3xl shadow-lg relative z-20 shrink-0">
        <div className="flex flex-col gap-1">
          <p className="text-white/80 text-sm font-medium uppercase tracking-wide">
            Meeting
          </p>
          <h2 className="text-white text-2xl font-bold">{meeting.title}</h2>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-48 no-scrollbar relative z-10">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900">Tap your free times</h3>
          <p className="text-sm text-gray-500 mt-1">
            Tap or drag across the grid to select when you&apos;re available. Green = free.
          </p>
          {loadError && (
            <p className="text-amber-600 text-sm mt-2">{loadError}</p>
          )}
        </div>

        {/* Week tabs */}
        {weeks.length > 1 && (
          <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
            {weeks.map((week, i) => {
              const startDate = parse(week[0], "yyyy-MM-dd", new Date());
              const endDate = parse(week[week.length - 1], "yyyy-MM-dd", new Date());
              const label = `${format(startDate, "MMM d")}-${format(endDate, "d")}`;
              return (
                <button
                  key={i}
                  onClick={() => setActiveWeek(i)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                    i === activeWeek
                      ? "bg-primary/10 border border-primary text-primary"
                      : "bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
                  }`}
                >
                  Week {i + 1} ({label})
                </button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        <div className="bg-surface-light rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden">
          <div className="flex">
            {/* Time labels */}
            <div className="flex flex-col pt-[50px] pr-3 gap-1 shrink-0 w-[56px] border-r border-gray-100 bg-surface-light z-10 sticky left-0">
              {hours.map((hour) => (
                <div key={hour} className="h-7 flex items-center justify-end w-full">
                  <span className="text-xs text-gray-400 font-medium">{hour}</span>
                </div>
              ))}
            </div>

            {/* Grid columns */}
            <div className="flex-1 overflow-x-auto no-scrollbar pl-1">
              <div
                className="grid gap-1 w-max min-w-full"
                style={{ gridTemplateColumns: `repeat(${currentDates.length}, 60px)` }}
              >
                {/* Day headers */}
                {currentDates.map((dateStr) => {
                  const d = parse(dateStr, "yyyy-MM-dd", new Date());
                  const dayName = DAY_NAMES[getDay(d)];
                  const dayNum = format(d, "d");
                  return (
                    <div key={dateStr} className="w-[60px] text-center pb-2 sticky top-0 bg-surface-light z-10">
                      <div className="text-[10px] font-medium text-gray-400 uppercase">{dayName}</div>
                      <div className="text-sm font-bold text-gray-900">{dayNum}</div>
                    </div>
                  );
                })}

                {/* Grid cells */}
                {hours.map((hour) =>
                  currentDates.map((dateStr) => {
                    const key = `${dateStr}|${hour}`;
                    const isSelected = selected.has(key);
                    return (
                      <div
                        key={key}
                        role="gridcell"
                        tabIndex={0}
                        aria-selected={isSelected}
                        className={`h-7 w-[60px] rounded cursor-pointer select-none touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isSelected
                            ? "bg-grid-selected shadow-sm"
                            : "bg-grid-default hover:opacity-80"
                        }`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handlePointerDown(key);
                        }}
                        onPointerEnter={() => handlePointerEnter(key)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            handlePointerDown(key);
                          }
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk buttons */}
        <div className="flex justify-center items-center gap-2 mt-4 mb-2">
          <button
            onClick={handleSelectAll}
            className="bg-[#e8f5e9] text-[#1b5e20] hover:bg-[#c8e6c9] active:bg-[#a5d6a7] px-3 h-9 text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Available All
          </button>
          <button
            onClick={handleClearAll}
            className="bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400 px-3 h-9 text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Unavailable All
          </button>
          {hasGoogleCalendar && (
            <button
              onClick={handleSyncCalendar}
              disabled={isSyncingCalendar}
              className="bg-[#e8eaf6] text-[#283593] hover:bg-[#c5cae9] active:bg-[#9fa8da] px-3 h-9 text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">calendar_month</span>
              {isSyncingCalendar ? "Syncing..." : "Sync"}
            </button>
          )}
        </div>
        {syncError && (
          <p className="text-red-500 text-sm text-center mt-1">{syncError}</p>
        )}
      </main>

      {/* Fixed footer */}
      <footer className="absolute bottom-0 left-0 w-full bg-surface-light/95 backdrop-blur-md border-t border-gray-200 p-4 pb-8 z-30">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <span>{isSubmitting ? "Submitting..." : "Submit Availability"}</span>
          {!isSubmitting && (
            <span className="material-symbols-outlined">send</span>
          )}
        </button>
      </footer>
    </div>
  );
}

export default function SelectPage({
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

  return <SelectContent meetingId={id} />;
}
