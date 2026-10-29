import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { PlantingDataset } from './planting-calendar.types';

/** Scraped by `tools/planting-calendar/scrape.mjs` (see that README). */
export const DEFAULT_DATASET = 'co-englewood.json';

/**
 * `nest-cli.json` copies every JSON asset under `src` into `dist`, so a real
 * build reads `dist/planting-calendar/data` while jest/ts-node read
 * `src/planting-calendar/data`.
 */
export const datasetDirs = (): string[] => [
  join(__dirname, 'data'),
  join(__dirname, '..', 'src', 'planting-calendar', 'data'),
  join(process.cwd(), 'src', 'planting-calendar', 'data'),
];

/** Fail soft: a missing or broken file yields `null` (never a 500). */
export const loadDataset = (file = DEFAULT_DATASET): PlantingDataset | null => {
  for (const dir of datasetDirs()) {
    const candidate = join(dir, file);
    if (!existsSync(candidate)) continue;
    try {
      return JSON.parse(readFileSync(candidate, 'utf8')) as PlantingDataset;
    } catch (error) {
      console.error(`Could not parse planting calendar at ${candidate}`);
      console.error(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  console.error(
    `No planting calendar dataset found (${file}); looked in ${datasetDirs().join(', ')}`,
  );
  return null;
};
