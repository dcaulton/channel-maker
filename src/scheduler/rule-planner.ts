import { PrismaService } from '../prisma/prisma.service';

export type RulePlanContext = {
  prisma: PrismaService;
  from: Date;
  to: Date;
};

export type PlannedEngineSlot = {
  startsAt: Date;
  endsAt: Date;
  title: string;
  description: string;
  mediaAssetId: string;
  ruleId: string;
};

export type RuleSnapshot = {
  id: string;
  kind: string;
  payload: unknown;
};

export interface RulePlanner {
  readonly kind: string;
  plan(rule: RuleSnapshot, ctx: RulePlanContext): Promise<PlannedEngineSlot[]>;
}

export function assertNoOverlaps(slots: PlannedEngineSlot[]): void {
  const ordered = [...slots].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
  for (let i = 1; i < ordered.length; i += 1) {
    const prev = ordered[i - 1];
    const next = ordered[i];
    if (next.startsAt < prev.endsAt) {
      throw new Error(
        `Overlapping engine slots: "${prev.title}" ${prev.startsAt.toISOString()}–${prev.endsAt.toISOString()} vs "${next.title}" ${next.startsAt.toISOString()}`,
      );
    }
  }
}
