/**
 * Firestore Write Validation
 * Ensures no undefined values are written to Firestore
 */

/**
 * Remove undefined values from an object recursively
 */
export function removeUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        const cleanedNested = removeUndefinedValues(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

/**
 * Assert required fields are present and not undefined
 */
export function assertRequiredFields(
  data: Record<string, any>,
  requiredFields: string[],
  context: string
): void {
  const missing: string[] = [];
  const undefinedFields: string[] = [];

  for (const field of requiredFields) {
    if (!(field in data)) {
      missing.push(field);
    } else if (data[field] === undefined) {
      undefinedFields.push(field);
    }
  }

  if (missing.length > 0) {
    console.error(`[FIRESTORE] Missing required fields in ${context}:`, missing);
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  if (undefinedFields.length > 0) {
    console.error(`[FIRESTORE] Undefined required fields in ${context}:`, undefinedFields);
    throw new Error(`Undefined required fields: ${undefinedFields.join(', ')}`);
  }
}

/**
 * Validate and clean Firestore document data
 */
export function validateFirestoreData<T extends Record<string, any>>(
  data: T,
  requiredFields: string[],
  context: string
): Partial<T> {
  // Assert required fields
  assertRequiredFields(data, requiredFields, context);

  // Remove undefined values
  const cleaned = removeUndefinedValues(data);

  // Log if any undefined values were removed
  const removedKeys = Object.keys(data).filter(key => data[key] === undefined && !(key in cleaned));
  if (removedKeys.length > 0) {
    console.warn(`[FIRESTORE] Removed undefined values from ${context}:`, removedKeys);
  }

  return cleaned;
}

