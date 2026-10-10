import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Wait } from 'testcontainers';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { POSTGRES_IMAGE } from './images';
import { Pool } from 'pg';
import { execSync } from 'node:child_process';

describe('Prisma + Postgres (Testcontainers)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase('channelmaker_test')
      .withUsername('test')
      .withPassword('test')
      .withWaitStrategy(
        Wait.forLogMessage('database system is ready to accept connections', 2),
      )
      .withStartupTimeout(120_000)
      .start();

    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;

    execSync('pnpm exec prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
        CI: 'true', // skip interactive / agent-style hooks when possible
      },
    });

    pool = new Pool({ connectionString });
    // Prevent unhandled 'error' events during shutdown
    pool.on('error', () => {
      // ignore — expected when the container is stopped
    });

    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();
  }, 180_000);

  afterAll(async () => {
    await prisma?.$disconnect().catch(() => undefined);
    await pool?.end().catch(() => undefined);
    await container?.stop().catch(() => undefined);
  });

  it('can create and read a Channel', async () => {
    const channel = await prisma.channel.create({
      data: {
        name: 'Classic Movies',
        slug: 'classic-movies',
        description: 'A test channel',
      },
    });

    expect(channel.id).toBeDefined();
    expect(channel.name).toBe('Classic Movies');
    expect(channel.slug).toBe('classic-movies');

    const found = await prisma.channel.findUnique({
      where: { slug: 'classic-movies' },
    });

    expect(found).not.toBeNull();
    expect(found?.id).toBe(channel.id);
  });

  it('can create a ScheduleSlot for a Channel', async () => {
    const channel = await prisma.channel.create({
      data: {
        name: 'Late Night',
        slug: 'late-night',
      },
    });

    const startsAt = new Date('2026-08-23T23:00:00Z');
    const endsAt = new Date('2026-08-24T01:00:00Z');

    const slot = await prisma.scheduleSlot.create({
      data: {
        channelId: channel.id,
        title: 'Night Owl Cinema',
        startsAt,
        endsAt,
      },
    });

    expect(slot.id).toBeDefined();
    expect(slot.channelId).toBe(channel.id);
    expect(slot.title).toBe('Night Owl Cinema');
  });
});
