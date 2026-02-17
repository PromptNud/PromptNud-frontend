"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  addDays,
  addWeeks,
} from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLiff } from "@/hooks/useLiff";
import type { CreateMeetingRequest } from "@/types/meeting";

type MeetingType = "meals" | "cafe" | "sports" | "others";
type LocationMode = "specify" | "decide_later" | "recommend";
type DayPreset = "weekdays" | "weekends" | "customize";

const MEETING_TYPES: { value: MeetingType; label: string; icon: string }[] = [
  { value: "meals", label: "Meals", icon: "restaurant" },
  { value: "cafe", label: "Cafe", icon: "local_cafe" },
  { value: "sports", label: "Sports", icon: "sports_basketball" },
  { value: "others", label: "Others", icon: "more_horiz" },
];

const DURATION_PRESETS = [
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
];

const DATE_RANGE_PRESETS = [
  { label: "1 Week", weeks: 1 },
  { label: "2 Weeks", weeks: 2 },
  { label: "3 Weeks", weeks: 3 },
  { label: "1 Month", months: 1 },
];

const DEFAULT_TIME_SLOTS = [
  "09:00-11:00",
  "11:00-13:00",
  "13:00-16:00",
  "17:00-19:00",
];

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const WEEKENDS = ["saturday", "sunday"];
const ALL_DAYS = [...WEEKDAYS, ...WEEKENDS];

function formatTimeSlot(slot: string): string {
  const [start, end] = slot.split("-");
  return `${start} - ${end}`;
}

function CreateMeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const { isInitialized } = useLiff();

  // Form state
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>("meals");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [locationMode, setLocationMode] = useState<LocationMode>("specify");
  const [location, setLocation] = useState("");
  const [dayPreset, setDayPreset] = useState<DayPreset>("weekdays");
  const [selectedDays, setSelectedDays] = useState<string[]>(WEEKDAYS);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([
    "11:00-13:00",
    "17:00-19:00",
  ]);
  const [notes, setNotes] = useState("");
  const [timeDetailsOpen, setTimeDetailsOpen] = useState(true);
  const [othersOpen, setOthersOpen] = useState(true);

  // Calendar
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const isInRange = useCallback(
    (day: Date) => {
      if (!dateRangeStart || !dateRangeEnd) return false;
      return (
        (isAfter(day, dateRangeStart) && isBefore(day, dateRangeEnd)) ||
        isSameDay(day, dateRangeStart) ||
        isSameDay(day, dateRangeEnd)
      );
    },
    [dateRangeStart, dateRangeEnd]
  );

  const handleDateClick = (day: Date) => {
    if (!isSameMonth(day, currentMonth)) return;
    if (!dateRangeStart || (dateRangeStart && dateRangeEnd)) {
      setDateRangeStart(day);
      setDateRangeEnd(null);
    } else {
      if (isBefore(day, dateRangeStart)) {
        setDateRangeEnd(dateRangeStart);
        setDateRangeStart(day);
      } else {
        setDateRangeEnd(day);
      }
    }
  };

  const handleDateRangePreset = (preset: (typeof DATE_RANGE_PRESETS)[number]) => {
    const today = new Date();
    setDateRangeStart(today);
    if (preset.weeks) {
      setDateRangeEnd(addDays(addWeeks(today, preset.weeks), -1));
    } else if (preset.months) {
      setDateRangeEnd(addDays(addMonths(today, preset.months), -1));
    }
  };

  const handleDayPreset = (preset: DayPreset) => {
    setDayPreset(preset);
    if (preset === "weekdays") setSelectedDays(WEEKDAYS);
    else if (preset === "weekends") setSelectedDays(WEEKENDS);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleTimeSlot = (slot: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  // Mutation
  const createMeeting = useMutation({
    mutationFn: (data: CreateMeetingRequest) => api.createMeeting(data),
    onSuccess: (meeting) => {
      router.push(`/`);
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !dateRangeStart || !dateRangeEnd) return;

    const data: CreateMeetingRequest = {
      title: title.trim(),
      type: meetingType,
      durationMinutes,
      dateRangeStart: format(dateRangeStart, "yyyy-MM-dd"),
      dateRangeEnd: format(dateRangeEnd, "yyyy-MM-dd"),
      preferredDays: selectedDays,
      preferredTimes: selectedTimeSlots,
      ...(locationMode === "specify" && location.trim()
        ? { location: location.trim() }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(groupId ? { groupId } : {}),
    };

    createMeeting.mutate(data);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-bg-light shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="bg-primary px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative z-10">
        <div className="flex flex-col gap-1">
          <label
            className="text-sm font-medium text-white/80"
            htmlFor="meetingName"
          >
            Meeting Title
          </label>
          <input
            id="meetingName"
            className="w-full bg-transparent border-0 border-b-2 border-white/40 focus:border-white text-white text-2xl font-bold placeholder:text-white/60 focus:ring-0 focus:outline-none px-0 py-2 transition-colors"
            placeholder="Enter Meeting Name"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-32 no-scrollbar">
        {/* General Details */}
        <section className="bg-surface-light rounded-xl shadow-sm border border-gray-100 mb-4 ring-2 ring-primary/20">
          <div className="w-full flex items-center justify-between p-4 pb-2 text-left border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <span className="material-symbols-outlined block">
                  description
                </span>
              </div>
              <span className="text-primary font-bold">General Details</span>
            </div>
          </div>
          <div className="p-4 space-y-6">
            {/* Type */}
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
                Type
              </label>
              <div className="grid grid-cols-4 gap-2 w-full">
                {MEETING_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setMeetingType(t.value)}
                    className={`w-full h-12 flex items-center justify-center gap-2 px-2 rounded-xl text-sm font-medium transition-colors ${
                      meetingType === t.value
                        ? "bg-primary/10 text-primary font-bold border border-primary/20"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {t.icon}
                    </span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
                Duration
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                    type="number"
                    min={15}
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(Number(e.target.value) || 15)
                    }
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    min
                  </div>
                </div>
                <div className="flex gap-2">
                  {DURATION_PRESETS.map((p) => (
                    <button
                      key={p.minutes}
                      onClick={() => setDurationMinutes(p.minutes)}
                      className={`h-12 min-w-[3rem] px-3 rounded-xl text-sm transition-colors flex items-center justify-center ${
                        durationMinutes === p.minutes
                          ? "bg-primary/10 text-primary font-bold border border-primary/20"
                          : "bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 border border-transparent"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
                Location
              </label>
              <div className="flex flex-col gap-2 mb-4">
                <button
                  onClick={() => setLocationMode("specify")}
                  className={`w-full h-12 flex items-center justify-start gap-3 px-4 rounded-xl text-sm transition-colors ${
                    locationMode === "specify"
                      ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                      : "bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 border border-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    location_on
                  </span>
                  <span>Specify Location</span>
                </button>
                <button
                  onClick={() => {
                    setLocationMode("decide_later");
                    setLocation("");
                  }}
                  className={`w-full h-12 flex items-center justify-start gap-3 px-4 rounded-xl text-sm transition-colors ${
                    locationMode === "decide_later"
                      ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                      : "bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 border border-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    location_off
                  </span>
                  <span>Decide Later</span>
                </button>
                <button
                  onClick={() => {
                    setLocationMode("recommend");
                    setLocation("");
                  }}
                  className={`w-full h-12 flex items-center justify-start gap-3 px-4 rounded-xl text-sm transition-colors ${
                    locationMode === "recommend"
                      ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                      : "bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 border border-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    assistant_navigation
                  </span>
                  <span>Recommend for Me</span>
                </button>
              </div>
              {locationMode === "specify" && (
                <>
                  <h4 className="text-sm font-normal text-gray-900 mb-2">
                    Where would you like to go?
                  </h4>
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                      <span className="material-symbols-outlined">search</span>
                    </div>
                    <input
                      className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-gray-400"
                      placeholder="Search for a location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Time Details */}
        <section className="bg-surface-light rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden ring-2 ring-primary/20">
          <button
            onClick={() => setTimeDetailsOpen(!timeDetailsOpen)}
            className="w-full flex items-center justify-between p-4 text-left border-b border-gray-100 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <span className="material-symbols-outlined block">
                  schedule
                </span>
              </div>
              <span className="text-primary font-bold">Time Details</span>
            </div>
            <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform ${timeDetailsOpen ? "" : "-rotate-180"}`}>
              expand_less
            </span>
          </button>
          {timeDetailsOpen && <div className="p-4 space-y-6">
            {/* Days */}
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
                Days
              </label>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => handleDayPreset("weekdays")}
                  className={`flex-1 px-2 py-3 rounded-xl text-sm text-center transition-colors ${
                    dayPreset === "weekdays"
                      ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                      : "bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 border border-transparent"
                  }`}
                >
                  Weekdays
                </button>
                <button
                  onClick={() => handleDayPreset("weekends")}
                  className={`flex-1 px-2 py-3 rounded-xl text-sm text-center transition-colors ${
                    dayPreset === "weekends"
                      ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                      : "bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 border border-transparent"
                  }`}
                >
                  Weekends
                </button>
                <button
                  onClick={() => {
                    setDayPreset("customize");
                    setSelectedDays(ALL_DAYS);
                  }}
                  className={`flex-1 px-2 py-3 rounded-xl text-sm text-center transition-colors ${
                    dayPreset === "customize"
                      ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                      : "bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 border border-transparent"
                  }`}
                >
                  Customize
                </button>
              </div>
              {dayPreset === "customize" && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {ALL_DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                        selectedDays.includes(day)
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-gray-100 text-gray-500 border border-transparent"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
                Date Range
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DATE_RANGE_PRESETS.map((p) => {
                  const isActive =
                    dateRangeStart &&
                    dateRangeEnd &&
                    (() => {
                      const today = new Date();
                      if (!isSameDay(dateRangeStart, today)) return false;
                      const expectedEnd = p.weeks
                        ? addDays(addWeeks(today, p.weeks), -1)
                        : addDays(addMonths(today, p.months!), -1);
                      return isSameDay(dateRangeEnd, expectedEnd);
                    })();
                  return (
                    <button
                      key={p.label}
                      onClick={() => handleDateRangePreset(p)}
                      className={`px-1 py-3 rounded-xl text-xs text-center transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                          : "bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 border border-transparent"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar */}
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
                Calendar
              </label>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                  >
                    <span className="material-symbols-outlined text-sm">
                      chevron_left
                    </span>
                  </button>
                  <span className="text-sm font-bold text-gray-900">
                    {format(currentMonth, "MMMM yyyy")}
                  </span>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                  >
                    <span className="material-symbols-outlined text-sm">
                      chevron_right
                    </span>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div
                      key={i}
                      className="text-[10px] font-medium text-gray-400 uppercase"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-center text-sm relative">
                  {calendarDays.map((day, i) => {
                    const inMonth = isSameMonth(day, currentMonth);
                    const isStart =
                      dateRangeStart && isSameDay(day, dateRangeStart);
                    const isEnd =
                      dateRangeEnd && isSameDay(day, dateRangeEnd);
                    const inRange = isInRange(day) && !isStart && !isEnd;

                    if (!inMonth) {
                      return (
                        <span key={i} className="text-gray-300 py-2">
                          {format(day, "d")}
                        </span>
                      );
                    }

                    if (isStart || isEnd) {
                      return (
                        <div key={i} className="relative">
                          {isStart &&
                            dateRangeEnd &&
                            !isSameDay(dateRangeStart!, dateRangeEnd) && (
                              <div className="absolute inset-y-0 right-0 left-1/2 bg-primary/10 rounded-l-full" />
                            )}
                          {isEnd &&
                            dateRangeStart &&
                            !isSameDay(dateRangeStart, dateRangeEnd!) && (
                              <div className="absolute inset-y-0 left-0 right-1/2 bg-primary/10 rounded-r-full" />
                            )}
                          <span
                            onClick={() => handleDateClick(day)}
                            className="relative z-10 block bg-primary text-white font-bold py-2 rounded-full shadow-md w-full h-full flex items-center justify-center cursor-pointer"
                          >
                            {format(day, "d")}
                          </span>
                        </div>
                      );
                    }

                    if (inRange) {
                      return (
                        <div
                          key={i}
                          className="bg-primary/10 flex items-center justify-center cursor-pointer"
                          onClick={() => handleDateClick(day)}
                        >
                          <span className="text-primary font-bold py-2 block w-full">
                            {format(day, "d")}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <span
                        key={i}
                        onClick={() => handleDateClick(day)}
                        className="text-gray-700 font-medium py-2 rounded-full hover:bg-gray-50 cursor-pointer"
                      >
                        {format(day, "d")}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  Time Slots
                </label>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                  GMT +7
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                {timeSlots.map((slot) => {
                  const isSelected = selectedTimeSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => toggleTimeSlot(slot)}
                      className={`relative w-full h-16 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary/10 border border-primary/20 shadow-sm"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          isSelected
                            ? "text-primary font-bold"
                            : "text-gray-700 font-medium"
                        }`}
                      >
                        {formatTimeSlot(slot)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>}
        </section>

        {/* Others */}
        <section className="bg-surface-light rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden ring-2 ring-primary/20">
          <button
            onClick={() => setOthersOpen(!othersOpen)}
            className="w-full flex items-center justify-between p-4 text-left border-b border-gray-100 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <span className="material-symbols-outlined block">tune</span>
              </div>
              <span className="text-primary font-bold">Others</span>
            </div>
            <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform ${othersOpen ? "" : "-rotate-180"}`}>
              expand_less
            </span>
          </button>
          {othersOpen && (
            <div className="p-4 space-y-6">
              {/* Notes */}
              <div>
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
                  Additional Notes
                </label>
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-gray-400 resize-none"
                  placeholder="Add any notes or special instructions for the meeting..."
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 w-full bg-surface-light/90 backdrop-blur-md border-t border-gray-200 p-4 pb-8 z-20">
        <button
          onClick={handleSubmit}
          disabled={
            !title.trim() ||
            !dateRangeStart ||
            !dateRangeEnd ||
            createMeeting.isPending
          }
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {createMeeting.isPending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              <span>Creating...</span>
            </>
          ) : (
            <span>Create Meeting</span>
          )}
        </button>
        {createMeeting.isError && (
          <p className="text-red-500 text-sm text-center mt-2">
            {createMeeting.error.message}
          </p>
        )}
      </footer>
    </div>
  );
}

export default function CreateMeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <CreateMeetingContent />
    </Suspense>
  );
}
