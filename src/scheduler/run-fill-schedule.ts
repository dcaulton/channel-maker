import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { SchedulerService } from './scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('run-fill-schedule');

function printHelp() {
  logger.log(`Fill engine-owned slots from the channel's active ruleset.

Usage:
  pnpm fill-schedule -- <channel-slug> [--dry-run]

Example:
  pnpm fill-schedule -- broadcast-rotation
  pnpm fill-schedule -- --dry-run broadcast-rotation
`);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printHelp();
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }

  const dryRun = args.includes('--dry-run');
  const channelSlug = args.find((arg) => !arg.startsWith('--'));
  if (!channelSlug) {
    printHelp();
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const scheduler = new SchedulerService(prisma as unknown as PrismaService);
    const result = await scheduler.fillChannel({ channelSlug, dryRun });
    logger.log(
      JSON.stringify(
        {
          channelId: result.channelId,
          rulesetId: result.rulesetId,
          dryRun: result.dryRun,
          slots: result.planned.length,
          titles: result.planned.map((slot) => ({
            startsAt: slot.startsAt.toISOString(),
            title: slot.title,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  logger.error(error);
  process.exit(1);
});
