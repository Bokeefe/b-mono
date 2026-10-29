import { Controller, Get, NotFoundException, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { FeedOptions, PlantingTableQuery } from './planting-calendar.feed';
import { PlantingCalendarService } from './planting-calendar.service';

const asTable = (value?: string): PlantingTableQuery =>
  value === 'spring' || value === 'fall' ? value : 'all';

/** `?columns=startIndoors,directSow` — the page's task-type legend, as a URL. */
const asColumns = (value?: string): string[] | undefined => {
  const columns = (value ?? '')
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
  return columns.length > 0 ? columns : undefined;
};

/**
 * The calendar is re-dated, not re-scraped, so the year is a parameter — and it
 * defaults to *now*, which is what keeps the page and the subscription URL
 * working next season without anyone touching the dataset.
 */
const asYear = (value?: string): number | undefined => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2200
    ? year
    : undefined;
};

const calendarYear = (): number => new Date().getFullYear();

@Controller('/api/planting-calendar')
export class PlantingCalendarController {
  constructor(
    private readonly plantingCalendarService: PlantingCalendarService,
  ) {}

  // curl -X GET "http://localhost:4171/api/planting-calendar"
  // curl -X GET "http://localhost:4171/api/planting-calendar?year=2027"
  @Get()
  getCalendar(@Query('year') year: string) {
    const payload = this.plantingCalendarService.getPayload({
      year: asYear(year) ?? calendarYear(),
    });
    if (!payload) {
      throw new NotFoundException('No planting calendar dataset is available');
    }
    return payload;
  }

  // curl -X GET "http://localhost:4171/api/planting-calendar/calendar.ics" -o garden.ics
  // curl -X GET "…/calendar.ics?table=spring&year=2027"
  // curl -X GET "…/calendar.ics?columns=startIndoors,directSow"    (legend filter)
  @Get('/calendar.ics')
  getCalendarFile(
    @Query('table') table: string,
    @Query('columns') columns: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const options: FeedOptions = {
      table: asTable(table),
      columns: asColumns(columns),
      year: asYear(year) ?? calendarYear(),
    };
    const feed = this.plantingCalendarService.getIcs(options);
    if (!feed) {
      throw new NotFoundException('No planting calendar dataset is available');
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${feed.filename}"`,
    );
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(feed.body);
  }
}
