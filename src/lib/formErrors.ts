import type { FormErrorItem } from '../components/ui';
import { isApiError } from '../api/errors';

export interface FieldDescriptor {
  key: string;
  label: string;
  targetId?: string;
}

/** Extracts the first server validation message matching any of the candidate field keys. */
export function pickFieldError(
  fieldErrors: Record<string, string[]> | undefined,
  ...keys: string[]
): string | undefined {
  if (!fieldErrors) return undefined;
  for (const key of keys) {
    const msgs = fieldErrors[key];
    if (msgs && msgs.length > 0) {
      return msgs[0];
    }
  }
  return undefined;
}

/** Converts a field map and an `ApiError` into inline field error strings + `FormErrorSummary` items. */
export function mapApiFieldErrors(
  error: unknown,
  descriptors: readonly FieldDescriptor[]
): {
  fieldMap: Record<string, string>;
  summaryItems: FormErrorItem[];
  topMessage: string;
} {
  if (!isApiError(error)) {
    return {
      fieldMap: {},
      summaryItems: [],
      topMessage: error instanceof Error ? error.message : 'Something went wrong.',
    };
  }

  const fieldMap: Record<string, string> = {};
  const summaryItems: FormErrorItem[] = [];
  const rawFields = error.fieldErrors ?? {};

  for (const descriptor of descriptors) {
    const msgs = rawFields[descriptor.key];
    if (msgs && msgs.length > 0) {
      fieldMap[descriptor.key] = msgs[0];
      summaryItems.push({
        field: descriptor.label,
        message: msgs[0],
        targetId: descriptor.targetId,
      });
    }
  }

  for (const [key, msgs] of Object.entries(rawFields)) {
    if (!(key in fieldMap) && msgs && msgs.length > 0) {
      fieldMap[key] = msgs[0];
      summaryItems.push({
        field: key === '_root' ? 'Form' : key,
        message: msgs[0],
      });
    }
  }

  return {
    fieldMap,
    summaryItems,
    topMessage: error.message,
  };
}
