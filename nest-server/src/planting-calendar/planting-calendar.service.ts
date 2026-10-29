import { Injectable, Logger } from '@nestjs/common';

import { loadDataset } from './planting-calendar.dataset';
import {
  buildFeed,
  buildPayload,
  FeedOptions,
  IcsFeed,
  PayloadOptions,
} from './planting-calendar.feed';
import { buildEvents } from './planting-calendar.events';
import {
  PlantingCalendarPayload,
  PlantingDataset,
  PlantingEvent,
} from './planting-calendar.types';

/**
 * Holds the scraped dataset for the process lifetime and delegates the pure
 * work to `planting-calendar.dataset/events/ical/feed` (which are framework
 * free and unit-tested on their own).
 *
 * The dataset is static — re-scrape and redeploy to refresh it — so there is
 * nothing to invalidate and no persistence beyond the committed JSON. It is
 * *re-dated* per request rather than rescraped: the windows are month/day
 * ranges hanging off average frost dates, so one scrape serves every year.
 */
@Injectable()
export class PlantingCalendarService {
  private readonly logger = new Logger(PlantingCalendarService.name);
  private dataset: PlantingDataset | null = null;
  private loadAttempted = false;

  /** Fail soft: a missing/broken file logs and yields `null`, never a 500. */
  getDataset(): PlantingDataset | null {
    if (!this.loadAttempted) {
      this.loadAttempted = true;
      this.dataset = loadDataset();
      if (this.dataset) {
        this.logger.log(
          `Loaded planting calendar for ${this.dataset.location.label} (scraped for ${this.dataset.season.year}, re-dated per request)`,
        );
      }
    }
    return this.dataset;
  }

  /** Dataset + expanded events, which is what the SPA consumes. */
  getPayload(options: PayloadOptions = {}): PlantingCalendarPayload | null {
    const dataset = this.getDataset();
    return dataset ? buildPayload(dataset, options) : null;
  }

  /** All events, or one season's — used by the ICS endpoint. */
  getEvents(options: FeedOptions = {}): PlantingEvent[] {
    const dataset = this.getDataset();
    if (!dataset) return [];
    return buildEvents(dataset, {
      table: options.table ?? 'all',
      year: options.year,
    });
  }

  /** A complete calendar file plus the name to offer as a download. */
  getIcs(options: FeedOptions = {}): IcsFeed | null {
    const dataset = this.getDataset();
    return dataset ? buildFeed(dataset, options) : null;
  }
}
