import { MaskableObject, MaskInput } from "../types";

/**
 * Recursively masks specified fields in an object or array with '***'.
 * @param {MaskInput} obj - The object or array to mask. Can be undefined.
 * @param {string[]} [fieldsToMask] - Array of field names to mask.
 *                                    Defaults to ['userName', 'userEmail']
 * @returns {MaskInput} The object or array with specified fields masked
 */
const mask = (obj: MaskInput, fieldsToMask: string[] = []): MaskInput => {
  /**
   * Implementation:
   * 1. If input is falsy or not an object, return as-is
   * 2. For arrays, recursively mask each element
   * 3. For objects:
   *    - If key matches fieldsToMask, replace value with "***"
   *    - If value is an object, recursively mask it
   *    - If value is a JSON string, parse and mask the parsed object
   *    - Otherwise keep value unchanged
   * This ensures sensitive fields are masked at any nesting level,
   * including within serialized JSON strings.
   */

  const maskFieldsSet = new Set(fieldsToMask.concat(["userName", "userEmail"]));

  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => mask(item, fieldsToMask)) as MaskInput;
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (maskFieldsSet.has(key)) {
        return [key, getMaskedValue(value as string)];
      }

      if (typeof value === "object" && value !== null) {
        return [key, mask(value as MaskableObject, fieldsToMask)];
      }

      if (typeof value === "string" && value.length > 0) {
        try {
          const parsedValue = JSON.parse(value) as MaskableObject;
          return [key, JSON.stringify(mask(parsedValue, fieldsToMask))];
        } catch (err) {
          // Not a valid JSON string
        }
      }

      return [key, value];
    })
  );
};

const getMaskedValue = (value: unknown) => {
  if (!value) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  // Split the string on delimiters
  const segments = value.split(/[@\s.]/);

  // Process each segment according to rules
  const maskedSegments = segments.map((segment) => {
    if (segment.length <= 2) {
      return segment;
    }
    if (segment.length > 4) {
      const firstTwo = segment.slice(0, 2);
      const lastTwo = segment.slice(-1);
      const middleLength = segment.length - 3;
      const maskedMiddle = "*".repeat(middleLength);
      return `${firstTwo}${maskedMiddle}${lastTwo}`;
    } else {
      // 3-4 characters
      const firstTwo = segment.slice(0, 2);
      const remainingLength = segment.length - 2;
      const masked = "*".repeat(remainingLength);
      return `${firstTwo}${masked}`;
    }
  });

  // Rejoin with original delimiters
  return value
    .split(/(@|\s|\.)/)
    .map((part, index) => {
      if (part === "@" || part === " " || part === ".") {
        return part;
      }
      return maskedSegments.shift() || part;
    })
    .join("");
};

export default mask;
