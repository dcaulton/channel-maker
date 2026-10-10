import { z } from 'zod';

// The shape GET /channels returns. Nest still validates writes with
// class-validator. This schema is the read contract the web can parse.
export const channelListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
  _count: z.object({ slots: z.number() }).optional(),
});

export const channelListSchema = z.array(channelListItemSchema);

export type ChannelListItem = z.infer<typeof channelListItemSchema>;
