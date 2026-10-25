import { z } from 'zod';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const packageFormSchema = z
  .object({
    destination: z
      .string()
      .trim()
      .min(1, 'El destino es obligatorio.')
      .max(255, 'El destino es demasiado largo.'),
    startDate: z
      .string()
      .trim()
      .min(1, 'La fecha de inicio es obligatoria.')
      .regex(isoDateRegex, 'La fecha de inicio debe tener formato YYYY-MM-DD.'),
    endDate: z
      .string()
      .trim()
      .min(1, 'La fecha de fin es obligatoria.')
      .regex(isoDateRegex, 'La fecha de fin debe tener formato YYYY-MM-DD.'),
    price: z
      .string()
      .trim()
      .min(1, 'El precio es obligatorio.')
      .regex(/^\d{1,10}(\.\d{1,2})?$/, 'El precio debe tener un formato válido: 899.00'),
    totalCapacity: z.preprocess(
      (value) => Number(value),
      z
        .number()
        .int('La capacidad debe ser un entero.')
        .min(1, 'La capacidad debe ser al menos 1.'),
    ),
  })
  .refine(
    ({ startDate, endDate }) => {
      if (!startDate || !endDate) {
        return true;
      }

      return new Date(endDate) >= new Date(startDate);
    },
    {
      message: 'La fecha de fin no puede ser anterior a la de inicio.',
      path: ['endDate'],
    },
  );

export type PackageFormValues = z.infer<typeof packageFormSchema>;
