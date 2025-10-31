import { ValueTransformer } from 'typeorm';

/**
 * Ensures numeric/decimal columns are returned as numbers with two decimal places.
 * Postgres returns DECIMAL/NUMERIC as strings by default.
 */
export class DecimalToNumberTransformer implements ValueTransformer {
  // Called when writing to the database
  to(entityValue: unknown): string | null {
    if (entityValue === null || entityValue === undefined) return null;
    const num = typeof entityValue === 'string' ? Number(entityValue) : (entityValue as number);
    if (Number.isNaN(num)) return null;
    // Ensure two decimal places as string for DB
    return num.toFixed(2);
  }

  // Called when reading from the database
  from(databaseValue: unknown): number | null {
    if (databaseValue === null || databaseValue === undefined) return null;
    const num = typeof databaseValue === 'string' ? Number(databaseValue) : (databaseValue as number);
    if (Number.isNaN(num)) return null;
    // Round to 2 decimals and return as number
    return Math.round(num * 100) / 100;
  }
}
