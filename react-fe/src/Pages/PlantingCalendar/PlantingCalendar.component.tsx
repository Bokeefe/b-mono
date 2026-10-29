import { useEffect, useMemo, useRef, useState } from "react";

import { apiService } from "../../services/api.service";
import type {
  PlantingCalendarPayload,
  PlantingEvent,
} from "../../services/planting-calendar.types";
import {
  GOOGLE_CALENDAR_IMPORT_URL,
  googleCalendarUrl,
  icsHref,
  icsPublicHref,
} from "./planting-calendar.export";
import {
  ALL_KINDS,
  CalendarView,
  TASK_KINDS,
  TaskKind,
  WEEKDAY_LABELS,
  addDays,
  addMonths,
  chipLabel,
  clampYear,
  eventKind,
  eventsInRange,
  eventsOn,
  filterEvents,
  formatCompact,
  formatDayHeading,
  formatEventRange,
  formatMonthHeading,
  formatMonthName,
  formatShortDay,
  formatWeekHeading,
  fromIso,
  harvestNote,
  localNote,
  monthGrid,
  nextEventFrom,
  seasonOpening,
  todayIso,
  viewRange,
  weekOf,
  windowProgress,
} from "./planting-calendar.utils";
import "./PlantingCalendar.scss";

const VIEWS: CalendarView[] = ["month", "week", "day"];

const PlantingCalendar = () => {
  const [payload, setPayload] = useState<PlantingCalendarPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState<string>(() => todayIso());
  const [kinds, setKinds] = useState<TaskKind[]>(ALL_KINDS);
  const [query, setQuery] = useState("");
  /** One payload per season, so stepping back into a year is instant. */
  const cache = useRef(new Map<number, PlantingCalendarPayload>());

  /**
   * The plan is re-dated per request, so every year is its own fetch. Following
   * the cursor's year — rather than pinning "the current year" once — is what
   * lets the calendar be paged forward forever: walk into January and the next
   * season loads itself.
   */
  const cursorYear = Number(cursor.slice(0, 4));

  useEffect(() => {
    const cached = cache.current.get(cursorYear);
    if (cached) {
      setPayload(cached);
      setStatus("ready");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    apiService
      .getPlantingCalendar(cursorYear)
      .then((data) => {
        if (cancelled) return;
        cache.current.set(cursorYear, data);
        setPayload(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [cursorYear]);

  const today = todayIso();

  /**
   * Only trust the payload once it is *this* year's: while 2027 is in flight
   * the 2026 plan is still in state, and drawing its chips in 2027 cells would
   * be quietly wrong.
   */
  const season = useMemo(
    () => (payload && payload.season.year === cursorYear ? payload : null),
    [payload, cursorYear],
  );

  const events = useMemo(
    () => (season ? filterEvents(season.events, { kinds, query }) : []),
    [season, kinds, query],
  );

  /** Every drawable task, so the count line can say "12 of 233". */
  const total = useMemo(
    () =>
      season ? season.events.filter((event) => !event.inverted).length : 0,
    [season],
  );

  /**
   * Per-family totals, so the legend explains how much of the plan it holds.
   * Tallied from the last payload rather than `season` because the counts are
   * identical in every year (same cells, different dates) — reading them off the
   * season would flash the whole legend to zero while the next year loads.
   */
  const counts = useMemo(() => {
    const tally = new Map<TaskKind, number>();
    for (const event of payload?.events ?? []) {
      if (event.inverted) continue;
      const kind = eventKind(event);
      tally.set(kind, (tally.get(kind) ?? 0) + 1);
    }
    return tally;
  }, [payload]);

  const toggleKind = (kind: TaskKind) =>
    setKinds((current) =>
      current.includes(kind)
        ? current.filter((option) => option !== kind)
        : [...current, kind],
    );

  const [from, to] = viewRange(view, cursor);
  const inView = eventsInRange(events, from, to);
  const nextMatch = nextEventFrom(events, to);
  const trimmed = query.trim();

  /**
   * Where the next season actually starts. Windows re-date to the same month and
   * day every year, so the earliest window on this screen is also next year's —
   * no extra fetch, and no landing people on an empty January.
   */
  const opening = seasonOpening(events, cursorYear + 1);
  const openingMonth = formatMonthName(opening);

  const shift = (direction: number) => {
    if (view === "month")
      setCursor((iso) => clampYear(addMonths(iso, direction)));
    else if (view === "week")
      setCursor((iso) => clampYear(addDays(iso, direction * 7)));
    else setCursor((iso) => clampYear(addDays(iso, direction)));
  };

  const openDay = (iso: string) => {
    setCursor(iso);
    setView("day");
  };

  /** Land on a month rather than a single day — used by "jump to next season". */
  const openMonth = (iso: string) => {
    setCursor(clampYear(iso));
    setView("month");
  };

  const heading =
    view === "month"
      ? formatMonthHeading(cursor)
      : view === "week"
        ? formatWeekHeading(weekOf(cursor))
        : formatDayHeading(cursor);

  /** The last payload we have, for the year-agnostic chrome (location, stats). */
  const shown = season ?? payload;

  /**
   * What to say about the rows the almanac never printed. Derived from the
   * events on screen, so it names whichever crops this calendar actually added
   * and stays silent for a location that has none.
   */
  const localCopy = localNote(shown?.events ?? []);

  return (
    <div className="planting-calendar">
      <header className="pc-head">
        <h1>denver planting calendar</h1>
        {payload && (
          <p className="pc-sub">
            {payload.location.label}, in the Denver metro
            {season ? (
              <>
                {" "}
                · last spring frost {season.season.lastSpringFrost ?? "—"} ·
                first fall frost {season.season.firstFallFrost ?? "—"}
              </>
            ) : null}
          </p>
        )}
      </header>

      {status === "loading" && !payload && (
        <p className="pc-note">reading the almanac…</p>
      )}
      {status === "error" && (
        <p className="pc-note pc-note--error">
          Could not reach the planting calendar API.
        </p>
      )}

      {payload && (
        <>
          <div className="pc-toolbar">
            <div className="pc-views" role="group" aria-label="Calendar view">
              {VIEWS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="pc-view-btn"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="pc-nav">
              <button
                type="button"
                className="pc-nav-btn"
                onClick={() => shift(-1)}
                aria-label={`previous ${view}`}
              >
                ‹
              </button>
              <button
                type="button"
                className="pc-nav-btn"
                onClick={() => setCursor(today)}
              >
                today
              </button>
              <button
                type="button"
                className="pc-nav-btn"
                onClick={() => shift(1)}
                aria-label={`next ${view}`}
              >
                ›
              </button>
            </div>

            <h2 className="pc-heading">{heading}</h2>
          </div>

          <div className="pc-filters">
            <label className="pc-search-field">
              <span className="pc-search-label">find</span>
              <input
                type="search"
                className="pc-search"
                value={query}
                onChange={(change) => setQuery(change.target.value)}
                placeholder="a crop or a chore — tomato, transplant"
              />
            </label>
            {trimmed !== "" && (
              <button
                type="button"
                className="pc-filter-btn"
                onClick={() => setQuery("")}
              >
                clear
              </button>
            )}
          </div>

          <Legend kinds={kinds} counts={counts} onToggle={toggleKind} />

          {season ? (
            <p className="pc-count">
              showing {events.length} of {total}{" "}
              {total === 1 ? "task" : "tasks"}
              {trimmed ? ` matching “${trimmed}”` : ""}
              {kinds.length < ALL_KINDS.length
                ? ` · ${ALL_KINDS.length - kinds.length} type${
                    ALL_KINDS.length - kinds.length === 1 ? "" : "s"
                  } hidden`
                : ""}
            </p>
          ) : (
            <p className="pc-note">reading {cursorYear} in the almanac…</p>
          )}

          {season && kinds.length === 0 && (
            <p className="pc-note">
              Every task type is switched off — tap the legend to bring one
              back.
            </p>
          )}

          {season && trimmed !== "" && events.length === 0 && (
            <p className="pc-note">
              Nothing in the plan matches “{trimmed}”. Try a crop
              (&ldquo;tomato&rdquo;) or a chore (&ldquo;transplant&rdquo;).
            </p>
          )}

          {season &&
            trimmed !== "" &&
            events.length > 0 &&
            inView.length === 0 &&
            view !== "day" && (
              <p className="pc-note pc-note--search">
                No matches {view === "month" ? "this month" : "this week"}.
                {nextMatch ? (
                  <>
                    {" "}
                    Next: {nextMatch.crop} — {nextMatch.task},{" "}
                    {formatEventRange(nextMatch)}.{" "}
                    <button
                      type="button"
                      className="pc-jump"
                      onClick={() => openDay(nextMatch.start)}
                    >
                      jump to {formatCompact(nextMatch.start)}
                    </button>
                  </>
                ) : (
                  " Nothing else matches this season."
                )}
              </p>
            )}

          {/*
            An empty month is the normal case in winter, and the whole point of
            re-dating: the plan is never missing, it is just somewhere else. Say
            where — and past the last window, hand off to next year.
          */}
          {season &&
            trimmed === "" &&
            kinds.length > 0 &&
            inView.length === 0 &&
            view !== "day" && (
              <p className="pc-note pc-note--search">
                Nothing scheduled {view === "month" ? "this month" : "this week"}
                .{" "}
                {nextMatch ? (
                  <>
                    Next: {nextMatch.crop} — {nextMatch.task},{" "}
                    {formatEventRange(nextMatch)}.{" "}
                    <button
                      type="button"
                      className="pc-jump"
                      onClick={() => openDay(nextMatch.start)}
                    >
                      jump to {formatCompact(nextMatch.start)}
                    </button>
                  </>
                ) : (
                  <>
                    The season is over — {cursorYear + 1}&rsquo;s windows open in{" "}
                    {openingMonth}.{" "}
                    <button
                      type="button"
                      className="pc-jump"
                      onClick={() => openMonth(opening)}
                    >
                      jump to {openingMonth.toLowerCase()} {cursorYear + 1}
                    </button>
                  </>
                )}
              </p>
            )}

          {view === "month" && (
            <MonthView
              cursor={cursor}
              today={today}
              events={events}
              onOpenDay={openDay}
            />
          )}
          {view === "week" && (
            <WeekView
              cursor={cursor}
              today={today}
              events={events}
              onOpenDay={openDay}
            />
          )}
          {view === "day" && (
            <DayView
              cursor={cursor}
              today={today}
              events={events}
              locationLabel={payload.location.label}
            />
          )}

          {season && <ExportPanel kinds={kinds} year={season.season.year} />}

          {shown && (
            <footer className="pc-foot">
              <p>
                {shown.stats.crops.spring + shown.stats.crops.fall} crops ·{" "}
                {shown.stats.dateCells} dated windows · season{" "}
                {shown.season.year}
                {shown.season.station ? ` (${shown.season.station})` : ""}
                {shown.season.sourceYear &&
                shown.season.sourceYear !== shown.season.year
                  ? ` · re-dated from ${shown.season.sourceYear}`
                  : ""}
              </p>
              {shown.warnings.length > 0 && (
                <p className="pc-warn">
                  {shown.warnings.length} source quirks kept as published:{" "}
                  {shown.warnings
                    .map((warning) => `${warning.crop} ${warning.column}`)
                    .join(", ")}
                </p>
              )}
              {shown.stats.harvest && (
                <p>
                  {shown.stats.harvest.crops} rows carry a harvest window:{" "}
                  {shown.stats.harvest.sourced} from the almanac&rsquo;s own days
                  to maturity, {shown.stats.harvest.estimated} from seed-packet
                  averages, which the chips mark with a tilde. The second kind is
                  a fortnight, not a date.
                </p>
              )}
              {localCopy && <p>{localCopy}</p>}
              <p>
                {localCopy
                  ? "Everything else comes from The Old Farmer’s Almanac"
                  : "Dates from The Old Farmer’s Almanac"}
                , keyed to average frost dates. The windows keep their month and
                day every year, so this calendar never expires. Growth is not
                guaranteed; the weather has opinions.
              </p>
            </footer>
          )}
        </>
      )}
    </div>
  );
};

interface LegendProps {
  kinds: TaskKind[];
  counts: Map<TaskKind, number>;
  onToggle: (kind: TaskKind) => void;
}

/**
 * Colour key and filter in one: every swatch is the colour its chips use, and
 * tapping it hides or shows that family of chores.
 */
const Legend = ({ kinds, counts, onToggle }: LegendProps) => (
  <div className="pc-legend" role="group" aria-label="Task types">
    {TASK_KINDS.map((info) => {
      const on = kinds.includes(info.kind);

      return (
        <button
          key={info.kind}
          type="button"
          className={`pc-legend-item${on ? "" : " is-off"}`}
          aria-pressed={on}
          title={`${info.hint} — ${on ? "tap to hide" : "tap to show"}`}
          onClick={() => onToggle(info.kind)}
        >
          <span
            className={`pc-legend-swatch pc-legend-swatch--${info.kind}`}
            aria-hidden="true"
          />
          <span className="pc-legend-label">{info.label}</span>
          <span className="pc-legend-count">{counts.get(info.kind) ?? 0}</span>
        </button>
      );
    })}
  </div>
);

interface CalendarViewProps {
  cursor: string;
  today: string;
  events: PlantingEvent[];
  onOpenDay: (iso: string) => void;
}

const MonthView = ({ cursor, today, events, onOpenDay }: CalendarViewProps) => {
  const month = cursor.slice(0, 7);

  return (
    <div className="pc-month">
      <div className="pc-month-head" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>
            {label.slice(0, 1)}
            <span className="pc-sr">{label}</span>
          </span>
        ))}
      </div>

      {monthGrid(cursor).map((week) => (
        <div className="pc-week-row" key={week[0]}>
          {week.map((iso) => {
            const dayEvents = eventsOn(events, iso);
            const classes = [
              "pc-day",
              iso.slice(0, 7) === month ? "" : "is-outside",
              iso === today ? "is-today" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={iso}
                type="button"
                className={classes}
                onClick={() => onOpenDay(iso)}
                aria-label={`${formatDayHeading(iso)}, ${dayEvents.length} tasks`}
              >
                <span className="pc-day-num">{fromIso(iso).getDate()}</span>
                <span className="pc-day-chips">
                  {dayEvents.slice(0, 2).map((event) => (
                    <span
                      key={event.id}
                      className={`pc-chip pc-chip--${eventKind(event)}`}
                    >
                      {chipLabel(event)}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="pc-more">+{dayEvents.length - 2}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const WeekView = ({ cursor, today, events, onOpenDay }: CalendarViewProps) => (
  <div className="pc-week">
    {weekOf(cursor).map((iso) => {
      const dayEvents = eventsOn(events, iso);

      return (
        <section
          key={iso}
          className={`pc-week-day${iso === today ? " is-today" : ""}`}
        >
          <button
            type="button"
            className="pc-week-date"
            onClick={() => onOpenDay(iso)}
          >
            <span>{formatShortDay(iso)}</span>
            {dayEvents.length > 0 && (
              <span className="pc-week-count">{dayEvents.length}</span>
            )}
          </button>
          <ul className="pc-week-list">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <EventRow event={event} />
              </li>
            ))}
          </ul>
        </section>
      );
    })}
  </div>
);

interface DayViewProps {
  cursor: string;
  today: string;
  events: PlantingEvent[];
  locationLabel: string;
}

const DayView = ({ cursor, today, events, locationLabel }: DayViewProps) => {
  const dayEvents = eventsOn(events, cursor);
  const next = events.find((event) => event.start > cursor);

  return (
    <div className="pc-day-view">
      {cursor === today && <p className="pc-count">that&rsquo;s today</p>}

      {dayEvents.length === 0 ? (
        <p className="pc-note">
          Nothing scheduled.
          {next
            ? ` Next up: ${next.crop} — ${next.task}, ${formatEventRange(next)}.`
            : ""}
        </p>
      ) : (
        <ul className="pc-agenda">
          {dayEvents.map((event) => (
            <li key={event.id} className="pc-agenda-item">
              <EventRow
                event={event}
                detail={cursor}
                locationLabel={locationLabel}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface EventRowProps {
  event: PlantingEvent;
  /** The day being viewed — turns a window into "day 4 of 8". */
  detail?: string;
  locationLabel?: string;
}

const EventRow = ({ event, detail, locationLabel }: EventRowProps) => {
  const progress = detail ? windowProgress(event, detail) : null;
  const note = harvestNote(event);
  const kind = eventKind(event);

  return (
    <div className={`pc-event pc-event--${kind}`}>
      <span className={`pc-dot pc-dot--${kind}`} aria-hidden="true" />
      <div className="pc-event-body">
        <p className="pc-event-title">{event.crop}</p>
        <p className="pc-event-task">
          {event.task}
          {note ? ` · ${note}` : ""} · {formatEventRange(event)}
          {progress ? ` · ${progress}` : ""}
        </p>
      </div>
      <div className="pc-event-links">
        {locationLabel && (
          <a
            href={googleCalendarUrl(event, locationLabel)}
            target="_blank"
            rel="noopener noreferrer"
            title="Add this task to Google Calendar"
          >
            + google
          </a>
        )}
        {event.guideUrl && (
          <a
            href={event.guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Growing guide for ${event.crop}`}
          >
            guide
          </a>
        )}
      </div>
    </div>
  );
};

const ExportPanel = ({
  kinds,
  year,
}: {
  kinds: TaskKind[];
  /** The season on screen — the download must be the year you are looking at. */
  year: number;
}) => {
  const filtered = kinds.length < ALL_KINDS.length;

  return (
    <section className="pc-export">
      <h2>take it with you</h2>
      <div className="pc-export-actions">
        <a className="pc-export-btn" href={icsHref(kinds, year)} download>
          download .ics
        </a>
        <a
          className="pc-export-btn"
          href={GOOGLE_CALENDAR_IMPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          import into google calendar
        </a>
      </div>
      <p className="pc-export-note">
        {filtered
          ? `the ${year} file holds only the task types switched on above`
          : `every ${year} task in the plan, spring through fall`}
      </p>
      <details className="pc-export-help">
        <summary>how the google part works</summary>
        <ol>
          <li>
            Download the .ics file — it follows the task types you have
            switched on above.
          </li>
          <li>
            Google Calendar → Settings → Import &amp; export → pick the file,
            and drop it in a calendar called &ldquo;Planting&rdquo;.
          </li>
          <li>
            Every window arrives as an all-day event. For a single task, use{" "}
            <em>+ google</em> beside it instead.
          </li>
        </ol>
        <p>
          Subscribing by URL works too, if you would rather Google refresh it
          for you: <code>{icsPublicHref(kinds, year)}</code>
        </p>
        <p>
          With no year on the end that URL follows whichever season is current,
          so a subscription set up once keeps up on its own.
        </p>
      </details>
    </section>
  );
};

export default PlantingCalendar;
