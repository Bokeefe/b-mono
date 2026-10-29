import { baseUrl } from "../../environment";
import type { PlantingEvent } from "../../services/planting-calendar.types";
import type { TaskKind } from "./planting-calendar.utils";
import { ALL_KINDS, addDays, kindColumns } from "./planting-calendar.utils";

/**
 * Google Calendar hand-off.
 *
 * There are two ways in and neither needs an API key, OAuth or a backend
 * integration:
 *
 *  1. per event — `calendar.google.com/calendar/render?action=TEMPLATE&…`
 *     opens the "new event" dialog prefilled, still one tap from saved.
 *  2. for the whole season — an `.ics` download that Google imports
 *     (Settings -> Import & export). A subscription URL would also work, but
 *     Google refreshes those on its own schedule and requires the feed to be
 *     publicly reachable.
 */

export const GOOGLE_CALENDAR_IMPORT_URL =
  "https://calendar.google.com/calendar/u/0/r/settings/import";

/** `2026-05-22` -> `20260522` (Google's all-day `dates` format). */
const compact = (iso: string) => iso.replace(/-/g, "");

export const eventDetails = (
  event: PlantingEvent,
  locationLabel: string,
): string =>
  [
    `${event.columnLabel} · ${locationLabel}`,
    // A harvest window is arithmetic on a planting date, not a sentence the
    // Almanac printed, so say whose number produced it — and whether picking
    // runs on to the first frost.
    event.harvest
      ? `Days to harvest: ${event.harvest.days} from ${event.harvest.fromLabel}${
          event.harvest.untilLabel ? `, until ${event.harvest.untilLabel}` : ""
        } (${event.harvest.estimated ? "seed-packet average" : "Old Farmer’s Almanac"})`
      : `Almanac window: ${event.label}`,
    // A local row is not on the page at all, so neither the mirroring nor the
    // provenance can be left implicit.
    event.origin === "local"
      ? `Locally added: the windows mirror ${event.derivedFrom ?? "a page row"}`
      : "",
    event.guideUrl ? `Growing guide: ${event.guideUrl}` : "",
    event.origin === "local"
      ? "Dates: locally added, not from The Old Farmer's Almanac"
      : "Dates: The Old Farmer's Almanac planting calendar",
  ]
    .filter(Boolean)
    .join("\n");

/**
 * Prefilled "Add to Google Calendar" dialog for one task.
 * `dates` is start/end-exclusive for all-day events, matching the ICS feed.
 */
export const googleCalendarUrl = (
  event: PlantingEvent,
  locationLabel: string,
): string => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compact(event.start)}/${compact(addDays(event.end, 1))}`,
    details: eventDetails(event, locationLabel),
    location: locationLabel,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * The importable feed for the task types currently switched on, dated in
 * `year`. With the whole legend on this is the plain `/calendar.ics`; hiding a
 * family adds `?columns=…`, so what you download is what you were looking at —
 * season included.
 */
export const icsHref = (
  kinds: TaskKind[] = ALL_KINDS,
  year?: number,
): string => {
  const params = new URLSearchParams();
  if (kinds.length < ALL_KINDS.length) {
    params.set("columns", kindColumns(kinds).join(","));
  }
  if (year) params.set("year", String(year));
  const query = params.toString();

  return `${baseUrl}/api/planting-calendar/calendar.ics${query ? `?${query}` : ""}`;
};

/**
 * The subscription URL for the "leave it running" instruction.
 *
 * The year is dropped when it is the current one, because the API already
 * defaults to the current year — that is what keeps a subscription current next
 * January without anyone re-subscribing. Browsing a past or future season keeps
 * the explicit year, since that is not the default.
 */
export const icsPublicHref = (
  kinds: TaskKind[] = ALL_KINDS,
  year?: number,
): string =>
  icsHref(kinds, year && year !== new Date().getFullYear() ? year : undefined);
