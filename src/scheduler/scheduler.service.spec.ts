import { SchedulerService } from './scheduler.service';
import { DEFAULT_FILL_HORIZON_MS } from './log-coverage';

describe('SchedulerService.ensureCoverage', () => {
  it('does not fill when the log already covers the horizon', async () => {
    const from = new Date('2026-09-19T18:00:00.000Z');
    const to = new Date(from.getTime() + DEFAULT_FILL_HORIZON_MS);
    const prisma = {
      scheduleSlot: {
        findMany: jest.fn().mockResolvedValue([{ startsAt: from, endsAt: to }]),
      },
      channel: { findUnique: jest.fn() },
      channelRuleset: { findFirst: jest.fn() },
    };
    const scheduler = new SchedulerService(prisma as never);
    const fill = jest.spyOn(scheduler, 'fillChannel');

    await scheduler.ensureCoverage('ch1', from, to);

    expect(fill).not.toHaveBeenCalled();
  });

  it('fills when coverage is missing and rules are sync', async () => {
    const from = new Date('2026-09-19T18:00:00.000Z');
    const to = new Date(from.getTime() + DEFAULT_FILL_HORIZON_MS);
    const prisma = {
      scheduleSlot: { findMany: jest.fn().mockResolvedValue([]) },
      channel: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ch1',
          slug: 'spooky-stories',
        }),
      },
      channelRuleset: {
        findFirst: jest.fn().mockResolvedValue({
          rulesetId: 'rs1',
          ruleset: {
            rules: [{ kind: 'windowed-sources', enabled: true }],
          },
        }),
      },
    };
    const scheduler = new SchedulerService(prisma as never);
    const fill = jest
      .spyOn(scheduler, 'fillChannel')
      .mockResolvedValue({ planned: [] } as never);

    await scheduler.ensureCoverage('ch1', from, to);

    expect(fill).toHaveBeenCalledWith({
      channelId: 'ch1',
      from,
      to,
    });
  });

  it('does not fill when a rule is async/llm', async () => {
    const from = new Date('2026-09-19T18:00:00.000Z');
    const to = new Date(from.getTime() + 3600_000);
    const prisma = {
      scheduleSlot: { findMany: jest.fn().mockResolvedValue([]) },
      channelRuleset: {
        findFirst: jest.fn().mockResolvedValue({
          ruleset: { rules: [{ kind: 'llm-prompt' }] },
        }),
      },
    };
    const scheduler = new SchedulerService(prisma as never);
    const fill = jest.spyOn(scheduler, 'fillChannel');

    await scheduler.ensureCoverage('ch1', from, to);

    expect(fill).not.toHaveBeenCalled();
  });
});
