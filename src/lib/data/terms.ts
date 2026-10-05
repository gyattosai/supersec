import type { Payload } from 'payload'
import { DATE_REGEX } from '@/collections/Terms'

export interface TermData {
  id?: string
  name: string
  startDate: string
  endDate: string
  createdAt?: string
  updatedAt?: string
}

export function validateTermDates(
  startDate: string,
  endDate: string,
): { isValid: boolean; error?: string } {
  if (!startDate || !DATE_REGEX.test(startDate)) {
    return { isValid: false, error: 'Start date must be in YYYY-MM-DD format' }
  }
  if (!endDate || !DATE_REGEX.test(endDate)) {
    return { isValid: false, error: 'End date must be in YYYY-MM-DD format' }
  }
  if (endDate < startDate) {
    return { isValid: false, error: 'End date must be on or after start date' }
  }
  return { isValid: true }
}

export async function createTerm(
  payload: Payload,
  data: { name: string; startDate: string; endDate: string },
): Promise<TermData> {
  const validation = validateTermDates(data.startDate, data.endDate)
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid term dates')
  }

  const result = await payload.create({
    collection: 'terms',
    data: {
      name: data.name.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
    },
  })

  return result as unknown as TermData
}

export async function getActiveTerm(
  payload: Payload,
  targetDate?: string,
): Promise<TermData | null> {
  // If no date provided, default to current Manila calendar date
  const date =
    targetDate ||
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())

  const result = await payload.find({
    collection: 'terms',
    where: {
      and: [
        {
          startDate: {
            less_than_equal: date,
          },
        },
        {
          endDate: {
            greater_than_equal: date,
          },
        },
      ],
    },
    limit: 1,
  })

  if (!result.docs || result.docs.length === 0) {
    return null
  }

  return result.docs[0] as unknown as TermData
}
