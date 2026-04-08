/**
 * build-usda-json.ts
 *
 * Downloads USDA SR Legacy CSV data, parses it, filters to foods with
 * complete macro data (protein, carbs, fat all present), and outputs a
 * minified JSON asset file for bundling into the React Native app.
 *
 * Usage: npx tsx scripts/build-usda-json.ts
 *
 * Output: assets/usda-foods.json — array of UsdaFoodRow objects
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as unzipper from 'unzipper';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsdaFoodRow {
  fdc_id: number;
  name: string;
  category: string;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USDA_ZIP_URL =
  'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '.cache');
const CACHE_ZIP = path.join(CACHE_DIR, 'usda-sr-legacy.zip');
const CACHE_EXTRACTED = path.join(CACHE_DIR, 'extracted');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'assets', 'usda-foods.json');

// USDA nutrient IDs for SR Legacy dataset
const NUTRIENT_PROTEIN = 1003;
const NUTRIENT_CARBS = 1005;
const NUTRIENT_FAT = 1004;

// ---------------------------------------------------------------------------
// Step 1: Download the ZIP (or use cached version)
// ---------------------------------------------------------------------------

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} ...`);
    const file = fs.createWriteStream(dest);

    const makeRequest = (requestUrl: string, redirectCount = 0): void => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      https.get(requestUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const location = response.headers.location;
          if (!location) {
            reject(new Error('Redirect with no Location header'));
            return;
          }
          console.log(`Following redirect to: ${location}`);
          makeRequest(location, redirectCount + 1);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} from ${requestUrl}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
        file.on('error', (err) => {
          fs.unlink(dest, () => undefined);
          reject(err);
        });
        response.on('error', (err) => {
          fs.unlink(dest, () => undefined);
          reject(err);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => undefined);
        reject(err);
      });
    };

    makeRequest(url);
  });
}

async function ensureZipDownloaded(): Promise<void> {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  if (fs.existsSync(CACHE_ZIP)) {
    const stats = fs.statSync(CACHE_ZIP);
    if (stats.size > 1_000_000) {
      console.log(`Using cached ZIP: ${CACHE_ZIP} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    // File exists but is suspiciously small — re-download
    console.log('Cached ZIP seems incomplete, re-downloading...');
    fs.unlinkSync(CACHE_ZIP);
  }

  await downloadFile(USDA_ZIP_URL, CACHE_ZIP);
  const stats = fs.statSync(CACHE_ZIP);
  console.log(`Downloaded: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

// ---------------------------------------------------------------------------
// Step 2: Extract the ZIP to cache directory
// ---------------------------------------------------------------------------

function hasCachedExtraction(): boolean {
  if (!fs.existsSync(CACHE_EXTRACTED)) return false;
  // Check both top-level and one level deep (ZIP may contain a subdirectory)
  if (fs.existsSync(path.join(CACHE_EXTRACTED, 'food.csv'))) return true;
  const entries = fs.readdirSync(CACHE_EXTRACTED);
  for (const entry of entries) {
    const candidate = path.join(CACHE_EXTRACTED, entry);
    if (
      fs.statSync(candidate).isDirectory() &&
      fs.existsSync(path.join(candidate, 'food.csv'))
    ) {
      return true;
    }
  }
  return false;
}

async function extractZip(): Promise<void> {
  if (hasCachedExtraction()) {
    console.log('Using cached extracted files.');
    return;
  }

  console.log('Extracting ZIP...');
  fs.mkdirSync(CACHE_EXTRACTED, { recursive: true });

  await fs
    .createReadStream(CACHE_ZIP)
    .pipe(unzipper.Extract({ path: CACHE_EXTRACTED }))
    .promise();

  // Files may be in a subdirectory — find where food.csv actually landed
  console.log('ZIP extracted.');
}

/**
 * Find the directory that contains food.csv (may be nested in subdirectory).
 */
function findExtractedDir(): string {
  // Check top level first
  if (fs.existsSync(path.join(CACHE_EXTRACTED, 'food.csv'))) {
    return CACHE_EXTRACTED;
  }

  // Check one level deep
  const entries = fs.readdirSync(CACHE_EXTRACTED);
  for (const entry of entries) {
    const candidate = path.join(CACHE_EXTRACTED, entry);
    if (
      fs.statSync(candidate).isDirectory() &&
      fs.existsSync(path.join(candidate, 'food.csv'))
    ) {
      return candidate;
    }
  }

  throw new Error(
    `Cannot find food.csv in extracted directory ${CACHE_EXTRACTED}`,
  );
}

// ---------------------------------------------------------------------------
// Step 3: Parse CSV files
// ---------------------------------------------------------------------------

/**
 * Simple CSV line parser that handles quoted fields with embedded commas.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse a CSV file into an array of objects keyed by header names.
 */
function parseCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    throw new Error(`Empty CSV file: ${filePath}`);
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? '').replace(/^"|"$/g, '').trim();
    });
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Step 4: Join and filter the data
// ---------------------------------------------------------------------------

interface NutrientEntry {
  protein?: number;
  carbs?: number;
  fat?: number;
}

function buildCategoryMap(
  foodCategoryRows: Record<string, string>[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of foodCategoryRows) {
    const id = parseInt(row['id'] ?? row['food_category_id'] ?? '', 10);
    const description = row['description'] ?? '';
    if (!isNaN(id) && description) {
      map.set(id, description);
    }
  }
  return map;
}

function buildNutrientMap(
  foodNutrientRows: Record<string, string>[],
): Map<number, NutrientEntry> {
  const map = new Map<number, NutrientEntry>();

  for (const row of foodNutrientRows) {
    const fdcId = parseInt(row['fdc_id'] ?? '', 10);
    const nutrientId = parseInt(row['nutrient_id'] ?? '', 10);
    const amountStr = row['amount'] ?? '';

    if (isNaN(fdcId) || isNaN(nutrientId) || amountStr === '') continue;

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;

    if (!map.has(fdcId)) {
      map.set(fdcId, {});
    }
    const entry = map.get(fdcId)!;

    if (nutrientId === NUTRIENT_PROTEIN) {
      entry.protein = amount;
    } else if (nutrientId === NUTRIENT_CARBS) {
      entry.carbs = amount;
    } else if (nutrientId === NUTRIENT_FAT) {
      entry.fat = amount;
    }
  }

  return map;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startTime = Date.now();

  // Ensure assets directory exists
  const assetsDir = path.join(PROJECT_ROOT, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Step 1: Download
  await ensureZipDownloaded();

  // Step 2: Extract
  await extractZip();
  const extractedDir = findExtractedDir();
  console.log(`CSV files at: ${extractedDir}`);

  // Step 3: Parse CSVs
  console.log('Parsing food.csv...');
  const foodRows = parseCsv(path.join(extractedDir, 'food.csv'));
  console.log(`  food.csv: ${foodRows.length} rows`);

  console.log('Parsing food_category.csv...');
  const categoryRows = parseCsv(path.join(extractedDir, 'food_category.csv'));
  console.log(`  food_category.csv: ${categoryRows.length} rows`);

  console.log('Parsing food_nutrient.csv (this may take a moment)...');
  const nutrientRows = parseCsv(path.join(extractedDir, 'food_nutrient.csv'));
  console.log(`  food_nutrient.csv: ${nutrientRows.length} rows`);

  // Build lookup maps
  const categoryMap = buildCategoryMap(categoryRows);
  const nutrientMap = buildNutrientMap(nutrientRows);

  // Step 4: Join and filter
  console.log('Joining and filtering foods...');
  const foods: UsdaFoodRow[] = [];
  let totalParsed = 0;
  let skippedIncomplete = 0;

  for (const row of foodRows) {
    totalParsed++;
    const fdcId = parseInt(row['fdc_id'] ?? '', 10);
    if (isNaN(fdcId)) continue;

    const name = (row['description'] ?? '').trim();
    if (!name) continue;

    // Look up nutrient data
    const nutrients = nutrientMap.get(fdcId);
    if (
      !nutrients ||
      nutrients.protein === undefined ||
      nutrients.carbs === undefined ||
      nutrients.fat === undefined
    ) {
      skippedIncomplete++;
      continue;
    }

    // Look up category via food_category_id
    const categoryId = parseInt(row['food_category_id'] ?? '', 10);
    const category = isNaN(categoryId)
      ? ''
      : (categoryMap.get(categoryId) ?? '');

    foods.push({
      fdc_id: fdcId,
      name,
      category,
      protein_per_100g: round2(nutrients.protein),
      carbs_per_100g: round2(nutrients.carbs),
      fat_per_100g: round2(nutrients.fat),
    });
  }

  // Step 5: Write output
  console.log(`\nWriting output to ${OUTPUT_PATH}...`);
  const json = JSON.stringify(foods);
  fs.writeFileSync(OUTPUT_PATH, json, 'utf-8');

  const outputStats = fs.statSync(OUTPUT_PATH);
  const outputMB = (outputStats.size / 1024 / 1024).toFixed(2);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n=== Build Complete ===');
  console.log(`  Foods parsed:      ${totalParsed}`);
  console.log(`  Skipped (missing): ${skippedIncomplete}`);
  console.log(`  Foods in output:   ${foods.length}`);
  console.log(`  Output size:       ${outputMB} MB`);
  console.log(`  Output path:       ${OUTPUT_PATH}`);
  console.log(`  Duration:          ${duration}s`);

  if (foods.length < 7000 || foods.length > 9000) {
    console.warn(`\nWARNING: Expected 7,000-9,000 foods, got ${foods.length}`);
  }
  if (outputStats.size > 3_145_728) {
    console.warn(`\nWARNING: Output exceeds 3MB (${outputMB} MB)`);
  }
}

main().catch((err: unknown) => {
  console.error('Build failed:', err);
  process.exit(1);
});
