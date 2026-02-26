"use client";

import { Suspense, useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  getDay,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  addDays,
  addWeeks,
} from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
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

// ── Wheel picker ──────────────────────────────────────────────────────────────

const ITEM_H = 32;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function WheelColumn({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialIdx = Math.max(0, items.indexOf(value));
  const [displayIdx, setDisplayIdx] = useState(initialIdx);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = initialIdx * ITEM_H;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (!ref.current) return;
    const idx = Math.max(
      0,
      Math.min(items.length - 1, Math.round(ref.current.scrollTop / ITEM_H))
    );
    setDisplayIdx(idx);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(items[idx]);
      ref.current?.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }, 80);
  };

  return (
    <div
      ref={ref}
      className="w-8 h-full overflow-y-scroll no-scrollbar"
      onScroll={handleScroll}
      style={{ touchAction: "pan-y" }}
    >
      <div style={{ height: ITEM_H }} />
      {items.map((item, i) => (
        <div
          key={item}
          style={{ height: ITEM_H }}
          className="flex items-center justify-center"
        >
          <span
            className={
              i === displayIdx
                ? "text-gray-900 text-lg font-bold relative z-10"
                : "text-gray-400 text-xs opacity-60"
            }
          >
            {item}
          </span>
        </div>
      ))}
      <div style={{ height: ITEM_H }} />
    </div>
  );
}

function TimeDrum({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  label: string;
  hour: string;
  minute: string;
  onHourChange: (v: string) => void;
  onMinuteChange: (v: string) => void;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="h-24 bg-gray-50 rounded-2xl border border-gray-100 relative overflow-hidden flex items-center justify-center">
        {/* highlight bar */}
        <div className="absolute inset-x-0 h-8 top-1/2 -translate-y-1/2 bg-white border-y border-gray-200 z-0 shadow-sm pointer-events-none" />
        <WheelColumn items={HOURS} value={hour} onChange={onHourChange} />
        <span className="text-gray-300 text-lg font-light z-10 relative pb-0.5 mx-0.5">:</span>
        <WheelColumn items={MINUTES} value={minute} onChange={onMinuteChange} />
        {/* fades */}
        <div className="absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-gray-50 via-gray-50/70 to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-gray-50 via-gray-50/70 to-transparent z-20 pointer-events-none" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [timeDetailsOpen, setTimeDetailsOpen] = useState(true);
  const [othersOpen, setOthersOpen] = useState(true);

  // Edit time slot modal
  const [editingSlotIdx, setEditingSlotIdx] = useState<number | null>(null);
  const [editStartH, setEditStartH] = useState("09");
  const [editStartM, setEditStartM] = useState("00");
  const [editEndH, setEditEndH] = useState("11");
  const [editEndM, setEditEndM] = useState("00");

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

  const openEditSlot = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const [start, end] = timeSlots[idx].split("-");
    const [sh, sm] = start.split(":");
    const [eh, em] = end.split(":");
    setEditStartH(sh);
    setEditStartM(sm);
    setEditEndH(eh);
    setEditEndM(em);
    setEditingSlotIdx(idx);
  };

  const saveEditSlot = () => {
    if (editingSlotIdx === null) return;
    const startMins = parseInt(editStartH) * 60 + parseInt(editStartM);
    const endMins = parseInt(editEndH) * 60 + parseInt(editEndM);
    if (startMins >= endMins) return;
    const oldSlot = timeSlots[editingSlotIdx];
    const newSlot = `${editStartH}:${editStartM}-${editEndH}:${editEndM}`;
    setTimeSlots((prev) => prev.map((s, i) => (i === editingSlotIdx ? newSlot : s)));
    setSelectedTimeSlots((prev) => prev.map((s) => (s === oldSlot ? newSlot : s)));
    setEditingSlotIdx(null);
  };

  // Locations query (for recommend mode)
  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.getLocations(),
    enabled: locationMode === "recommend",
  });
  const locations = locationsData?.data ?? [];

  // Mutation
  const createMeeting = useMutation({
    mutationFn: (data: CreateMeetingRequest) => api.createMeeting(data),
    onSuccess: () => {
      router.push("/");
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !dateRangeStart || !dateRangeEnd || !groupId) return;

    // Expand date range + day filter → actual date list
    const dayNameMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const allDatesInRange = eachDayOfInterval({ start: dateRangeStart, end: dateRangeEnd });
    const selectedDates = allDatesInRange
      .filter(d => selectedDays.includes(dayNameMap[getDay(d)]))
      .map(d => format(d, "yyyy-MM-dd"));

    // Split "HH:MM-HH:MM" → {start, end}
    const timeSlotObjects = selectedTimeSlots.map(slot => {
      const [start, end] = slot.split("-");
      return { start, end };
    });

    if (selectedDates.length === 0) {
      setValidationError("No dates match the selected day filters. Please adjust your date range or day selection.");
      return;
    }
    if (timeSlotObjects.length === 0) {
      setValidationError("Please select at least one time slot.");
      return;
    }
    setValidationError(null);

    const data: CreateMeetingRequest = {
      title: title.trim(),
      lineGroupId: groupId,
      type: meetingType,
      durationMinutes,
      locationMode,
      selectedDates,
      timeSlots: timeSlotObjects,
      memberMode: "all_members",
      ...((locationMode === "specify" || locationMode === "recommend") && location.trim()
        ? { location: location.trim() }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
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
              <div className="grid grid-cols-2 gap-2 w-full">
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
              {locationMode === "recommend" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Where would you like to go?
                  </label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setLocation(loc.name)}
                        className={`flex-none h-12 px-6 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                          location === loc.name
                            ? "bg-primary/10 text-primary font-bold border border-primary/20"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                        }`}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
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
                          <button
                            onClick={() => handleDateClick(day)}
                            className="relative z-10 bg-primary text-white font-bold py-2 rounded-full shadow-md w-full h-full flex items-center justify-center cursor-pointer"
                          >
                            {format(day, "d")}
                          </button>
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
                {timeSlots.map((slot, slotIdx) => {
                  const isSelected = selectedTimeSlots.includes(slot);
                  return (
                    <div
                      key={slot}
                      onClick={() => toggleTimeSlot(slot)}
                      className={`relative w-full h-16 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
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
                      <button
                        onClick={(e) => openEditSlot(e, slotIdx)}
                        className={`absolute top-1 right-1 rounded-full p-1 transition-colors ${
                          isSelected
                            ? "hover:bg-primary/20 text-primary"
                            : "hover:bg-gray-200 text-gray-400"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "16px" }}
                        >
                          edit
                        </span>
                      </button>
                    </div>
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

      {/* Edit Time Slot Modal */}
      {editingSlotIdx !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingSlotIdx(null)}
          />
          <div className="relative w-full max-w-[340px] bg-white rounded-3xl shadow-2xl p-6">
            <h3 className="text-center text-lg font-bold text-gray-900 mb-6">
              Edit Time Slot
            </h3>
            <div className="flex items-start gap-3 mb-6">
              <TimeDrum
                label="Start Time"
                hour={editStartH}
                minute={editStartM}
                onHourChange={setEditStartH}
                onMinuteChange={setEditStartM}
              />
              <div className="self-center pt-5 text-gray-400 font-medium text-sm">
                to
              </div>
              <TimeDrum
                label="End Time"
                hour={editEndH}
                minute={editEndM}
                onHourChange={setEditEndH}
                onMinuteChange={setEditEndM}
              />
            </div>
            {(() => {
              const invalid =
                parseInt(editStartH) * 60 + parseInt(editStartM) >=
                parseInt(editEndH) * 60 + parseInt(editEndM);
              return (
                <>
                  {invalid && (
                    <p className="text-center text-xs font-medium text-red-500 mb-3 -mt-3">
                      Start time must be before end time
                    </p>
                  )}
                  <div className="flex justify-center mb-6">
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                      (GMT +7) Bangkok Time
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setEditingSlotIdx(null)}
                      className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditSlot}
                      disabled={invalid}
                      className="w-full py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Save
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 w-full bg-surface-light/90 backdrop-blur-md border-t border-gray-200 p-4 pb-8 z-20">
        <button
          onClick={handleSubmit}
          disabled={
            !title.trim() ||
            !dateRangeStart ||
            !dateRangeEnd ||
            !groupId ||
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
        {validationError && (
          <p className="text-red-500 text-sm text-center mt-2">{validationError}</p>
        )}
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
