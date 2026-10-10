import { z } from 'zod';

export const windowedItemSchema = z.object({
  start: z.string(),
  end: z.string(),
  days: z.union([z.literal('daily'), z.array(z.number())]),
  mode: z.enum(['live', 'episodes', 'slate']),
  title: z.string(),
  seriesTitle: z.string().optional(),
  seriesTitles: z.array(z.string()).optional(),
  overflow: z.enum(['slate', 'carry']).optional(),
  slateTitle: z.string().optional(),
});

export const windowedPayloadSchema = z.object({
  timeZone: z.string(),
  episodeOrigin: z.string(),
  items: z.array(windowedItemSchema),
  fallbackSlateTitle: z.string().optional(),
});

export const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  enabled: z.boolean(),
  payload: z.unknown(),
});

export const rulesetDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  rules: z.array(ruleSchema),
});

export const bindingSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  rulesetId: z.string(),
  isActive: z.boolean(),
  priority: z.number(),
  ruleset: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
});

export const bindingListSchema = z.array(bindingSchema);

export type WindowedItem = z.infer<typeof windowedItemSchema>;
export type WindowedPayload = z.infer<typeof windowedPayloadSchema>;
export type RulesetDetail = z.infer<typeof rulesetDetailSchema>;

export const rotatePayloadSchema = z.object({
  streamTitles: z.array(z.string()),
  slotDurationSec: z.number(),
});

export type RotatePayload = z.infer<typeof rotatePayloadSchema>;
export type Rule = z.infer<typeof ruleSchema>;

export const PLANNED_KINDS = ['windowed-sources', 'rotate-tv-streams'] as const;
