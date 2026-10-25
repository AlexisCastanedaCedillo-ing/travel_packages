import { describe, expect, it } from 'vitest';
import { packageFormSchema } from './packages';

describe('packageFormSchema', () => {
  it('accepts a valid package form', () => {
    const result = packageFormSchema.safeParse({
      destination: 'Cancún, México',
      startDate: '2027-05-10',
      endDate: '2027-05-17',
      price: '899.50',
      totalCapacity: 12,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an end date earlier than the start date', () => {
    const result = packageFormSchema.safeParse({
      destination: 'Cancún, México',
      startDate: '2027-05-17',
      endDate: '2027-05-10',
      price: '899.50',
      totalCapacity: 12,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['endDate'],
          message: 'La fecha de fin no puede ser anterior a la de inicio.',
        }),
      );
    }
  });
});
