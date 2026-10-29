import type { PlantingEvent } from "../../services/planting-calendar.types";

export type CalendarView = "month" | "week" | "day";

/**
 * The chore families the legend names, and the source columns each one covers.
 * One colour per family, in the order the legend lists them.
 */
export type TaskKind =
  | "indoor"
  | "transplant"
  | "sow"
  | "last"
  | "harvest"
  | "frost";

export interface TaskKindInfo {
  kind: TaskKind;
  /** Legend wording — short enough to sit in a chip row. */
  label: string;
  /** Tooltip: what the family actually means in the garden. */
  hint: string;
  /** Dataset column keys that belong to this family. */
  columns: string[];
}

export const TASK_KINDS: TaskKindInfo[] = [
  {
    kind: "indoor",
    label: "seed starting",
    hint: "start seeds indoors before moving seedlings out",
    columns: ["startIndoors"],
  },
  {
    kind: "transplant",
    label: "transplanting",
    hint: "move seedlings into the garden",
    columns: ["transplantOutdoors", "transplant"],
  },
  {
    kind: "sow",
    label: "direct sowing",
    hint: "seeds straight into the soil, spring or fall",
    columns: ["directSow", "startSeedsOutdoors"],
  },
  {
    kind: "last",
    label: "last planting",
    hint: "the last safe date to plant before frost",
    columns: ["lastPlanting"],
  },
  {
    kind: "harvest",
    label: "harvesting",
    hint: "when a sowing or transplant should be ready to pick — a fuzzier promise than the rest",
    columns: ["harvest"],
  },
  {
    kind: "frost",
    label: "frost dates",
    hint: "the average last spring and first fall frost",
    columns: ["lastSpringFrost", "firstFallFrost"],
  },
];

export const ALL_KINDS: TaskKind[] = TASK_KINDS.map((info) => info.kind);

/** Which family an event belongs to — the one place colour is decided. */
export const eventKind = (event: PlantingEvent): TaskKind => {
  if (event.kind === "frost") return "frost";
  const family = TASK_KINDS.find((info) => info.columns.includes(event.column));
  // Nothing in the current dataset lands here, but an unknown column still
  // needs a colour rather than a broken chip.
  return family ? family.kind : "last";
};

/** The `columns` query value for a set of families (used by the .ics link). */
export const kindColumns = (kinds: TaskKind[]): string[] =>
  TASK_KINDS.filter((info) => kinds.includes(info.kind)).flatMap(
    (info) => info.columns,
  );

/** True when the window is arithmetic on a seed-packet average, not the Almanac. */
export const isEstimate = (event: PlantingEvent): boolean =>
  event.harvest?.estimated === true;

/**
 * Month-view chip text. Only a handful of characters fit, so an estimated
 * harvest is the one thing that gets flagged: "~Tomatoes" reads as "somewhere
 * around then", which is exactly what the number is worth.
 */
export const chipLabel = (event: PlantingEvent): string =>
  isEstimate(event) ? `~${event.crop}` : event.crop;

/**
 * The wait behind a harvest window, for the agenda line: "about 75 days from
 * transplant". A crop that is picked until the frost keeps going after the first
 * ripe day, so the note says where the window stops as well as where it starts.
 * Empty for every other kind of event, so callers can just append.
 */
export const harvestNote = (event: PlantingEvent): string => {
  const harvest = event.harvest;
  if (!harvest) return "";
  const wait = `${harvest.estimated ? "about " : ""}${harvest.days} days from ${
    harvest.fromLabel
  }`;
  return harvest.untilLabel ? `${wait}, until ${harvest.untilLabel}` : wait;
};

/**
 * One sentence about the rows the almanac's table never printed (tobacco,
 * cannabis): which row they copy their windows from and where picking stops.
 * Empty when every row on screen came from the page, so the footer can append it
 * without checking `stats`.
 */
export const localNote = (events: PlantingEvent[]): string => {
  const local = events.filter((event) => event.origin === "local");
  if (local.length === 0) return "";

  const unique = (values: (string | null | undefined)[]): string[] => [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
  const list = (items: string[]): string =>
    items.length <= 1
      ? items.join("")
      : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

  const names = unique(local.map((event) => event.crop));
  const donors = unique(local.map((event) => event.derivedFrom));
  const frosts = unique(local.map((event) => event.harvest?.untilLabel));

  const verb =
    names.length === 1 ? "is a local addition" : "are local additions";
  const frost = frosts.length ? `, and picking runs to ${list(frosts)}` : "";

  return `${list(names)} ${verb}, not the almanac’s: the windows mirror ${list(
    donors,
  )}${frost}.`;
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEK_STARTS_ON = 0;

export interface EventFilters {
  /** Families to show; starts as every kind, so the legend can hide some. */
  kinds: TaskKind[];
  /** Free-text match against crop + operation + task ("tomato", "transplant"). */
  query: string;
}

const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);

/**
 * Local-time ISO date (`2026-05-22`).
 *
 * Deliberately *not* `toISOString()`: the garden calendar is made of calendar
 * days, so a date must never be shifted by a time zone offset.
 */
export const toIso = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromIso = (iso: string): Date => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const todayIso = (): string => toIso(new Date());

export const addDays = (iso: string, days: number): string => {
  const date = fromIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
};

/** Keeps the day-of-month where possible (`Jan 31` + 1 month -> `Feb 28`). */
export const addMonths = (iso: string, months: number): string => {
  const date = fromIso(iso);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toIso(date);
};

/**
 * The years the API will date a plan in — mirrors `asYear` in
 * `nest-server/src/planting-calendar/planting-calendar.controller.ts`.
 */
export const FIRST_CALENDAR_YEAR = 1900;
export const LAST_CALENDAR_YEAR = 2200;

/**
 * Keep a cursor inside the range the API can actually serve. The page asks for
 * the year on screen, and an out-of-range `?year=` falls back to the current
 * year, so paging past December 2200 would never satisfy the "is this my year?"
 * check and the calendar would sit on `reading 2201…` forever.
 */
export const clampYear = (iso: string): string => {
  const year = Number(iso.slice(0, 4));
  if (year < FIRST_CALENDAR_YEAR) return `${FIRST_CALENDAR_YEAR}-01-01`;
  if (year > LAST_CALENDAR_YEAR) return `${LAST_CALENDAR_YEAR}-12-31`;
  return iso;
};

export const startOfWeek = (iso: string, weekStartsOn = WEEK_STARTS_ON): string => {
  const weekday = fromIso(iso).getDay();
  return addDays(iso, -((weekday - weekStartsOn + 7) % 7));
};

export const startOfMonth = (iso: string): string => `${iso.slice(0, 7)}-01`;

export const weekOf = (iso: string, weekStartsOn = WEEK_STARTS_ON): string[] =>
  Array.from({ length: 7 }, (_, index) =>
    addDays(startOfWeek(iso, weekStartsOn), index),
  );

/**
 * Whole weeks covering the month that `iso` falls in. Leading/trailing days
 * belong to the neighbouring months (the UI dims them). Trailing weeks with no
 * day in the month are dropped so February does not render an empty row.
 */
export const monthGrid = (iso: string): string[][] => {
  const month = iso.slice(0, 7);
  const first = startOfMonth(iso);
  const last = addDays(addMonths(first, 1), -1);
  const weeks: string[][] = [];

  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(start, index)));
  }

  return weeks.filter((week) => week.some((day) => day.slice(0, 7) === month));
};

/** Inclusive membership test: windows occupy every day between start and end. */
export const occursOn = (event: PlantingEvent, iso: string): boolean =>
  event.start <= iso && iso <= event.end;

export const eventsOn = (
  events: PlantingEvent[],
  iso: string,
): PlantingEvent[] => events.filter((event) => occursOn(event, iso));

export const eventsInWeek = (
  events: PlantingEvent[],
  days: string[],
): PlantingEvent[] => {
  if (days.length === 0) return [];
  const [from, to] = [days[0], days[days.length - 1]];
  return events.filter((event) => event.start <= to && event.end >= from);
};

/**
 * Drops inverted ranges (they cannot be drawn on a calendar) and applies the
 * legend + search filters.
 */
export const filterEvents = (
  events: PlantingEvent[],
  { kinds, query }: EventFilters,
): PlantingEvent[] => {
  const needle = query.trim().toLowerCase();

  return events.filter((event) => {
    if (event.inverted) return false;
    if (!kinds.includes(eventKind(event))) return false;

    if (!needle) return true;
    return `${event.crop} ${event.columnLabel} ${event.task}`
      .toLowerCase()
      .includes(needle);
  });
};

/** Inclusive first and last day of the period the cursor sits in. */
export const viewRange = (
  view: CalendarView,
  cursor: string,
): [string, string] => {
  if (view === "day") return [cursor, cursor];
  if (view === "week") {
    const days = weekOf(cursor);
    return [days[0], days[days.length - 1]];
  }
  const first = startOfMonth(cursor);
  return [first, addDays(addMonths(first, 1), -1)];
};

/** Every event that overlaps the inclusive range. */
export const eventsInRange = (
  events: PlantingEvent[],
  from: string,
  to: string,
): PlantingEvent[] =>
  events.filter((event) => event.start <= to && event.end >= from);

/**
 * The first event still running or yet to start — "next up" for an empty view,
 * since events arrive sorted by start date.
 */
export const nextEventFrom = (
  events: PlantingEvent[],
  iso: string,
): PlantingEvent | null => events.find((event) => event.end >= iso) ?? null;

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const monthFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const monthOnlyFormat = new Intl.DateTimeFormat("en-US", { month: "long" });
const shortFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const compactFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export const formatDayHeading = (iso: string): string =>
  dayFormat.format(fromIso(iso));
export const formatMonthHeading = (iso: string): string =>
  monthFormat.format(fromIso(iso));
/** Just the month, for copy that already names the year ("open in February"). */
export const formatMonthName = (iso: string): string =>
  monthOnlyFormat.format(fromIso(iso));
export const formatShortDay = (iso: string): string =>
  shortFormat.format(fromIso(iso));
export const formatCompact = (iso: string): string =>
  compactFormat.format(fromIso(iso));

export const formatWeekHeading = (days: string[]): string => {
  if (days.length === 0) return "";
  const first = formatCompact(days[0]);
  const last = formatCompact(days[days.length - 1]);
  return `${first} – ${last}, ${days[0].slice(0, 4)}`;
};

export const formatEventRange = (event: PlantingEvent): string =>
  event.start === event.end
    ? formatCompact(event.start)
    : `${formatCompact(event.start)} – ${formatCompact(event.end)}`;

/**
 * The first day the next season is busy, for the "season is over" hand-off.
 *
 * Windows keep their month and day in every year — that is what makes the plan
 * re-dateable at all — so the earliest window of the loaded season is also the
 * earliest window of the next one. That matters now that Denver has nothing at
 * all before mid-February: sending someone to January would land them on an
 * empty month, so the hand-off has to point at real work.
 *
 * Frost markers are not plantings, and a filter that hides every task leaves
 * nothing to learn from, so both cases fall back to January.
 */
export const seasonOpening = (
  events: PlantingEvent[],
  year: number,
): string => {
  const first = events
    .filter((event) => event.kind !== "frost")
    .reduce<PlantingEvent | null>(
      (earliest, event) =>
        !earliest || event.start < earliest.start ? event : earliest,
      null,
    );

  return first ? `${year}-${first.start.slice(5)}` : `${year}-01-01`;
};

/** How far into a window today is, e.g. "day 4 of 8". */
export const windowProgress = (
  event: PlantingEvent,
  iso: string,
): string | null => {
  if (event.start === event.end) return null;
  const total =
    Math.round(
      (fromIso(event.end).getTime() - fromIso(event.start).getTime()) / 86_400_000,
    ) + 1;
  const current =
    Math.round(
      (fromIso(iso).getTime() - fromIso(event.start).getTime()) / 86_400_000,
    ) + 1;
  if (current < 1 || current > total) return null;
  return `day ${current} of ${total}`;
};
