import { z } from 'zod';

export const workHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  seriesTitle: z.string().nullable().optional(),
  season: z.number().nullable().optional(),
  episode: z.number().nullable().optional(),
  _count: z.object({ assets: z.number() }).optional(),
});

export const workPageSchema = z.object({
  items: z.array(workHitSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

export type WorkHit = z.infer<typeof workHitSchema>;
export type WorkPage = z.infer<typeof workPageSchema>;
