import { z } from 'zod';

// GET /channels/:id/schedule. A slot with no mediaAsset is a theme
// whose title is still undecided. The join is still slot -> asset.
export const scheduleSlotSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  mediaAsset: z
    .object({
      id: z.string(),
      title: z.string(),
      sourceUrl: z.string(),
      work: z
        .object({
          id: z.string(),
          title: z.string(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

export const scheduleSchema = z.array(scheduleSlotSchema);

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;
