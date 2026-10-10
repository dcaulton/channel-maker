import { z } from 'zod';

export const assetHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceUrl: z.string(),
  work: z
    .object({
      id: z.string(),
      title: z.string(),
      seriesTitle: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const assetPageSchema = z.object({
  items: z.array(assetHitSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

export type AssetHit = z.infer<typeof assetHitSchema>;
export type AssetPage = z.infer<typeof assetPageSchema>;
