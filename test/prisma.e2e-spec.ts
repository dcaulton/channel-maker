import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { INestApplication } from '@nestjs/common';
import { Wait } from 'testcontainers';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { execSync } from 'node:child_process';

describe('Prisma + Postgres (Testcontainers)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let pool: Pool;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
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

    execSync('pnpm dlx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: connectionString },
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
    // 1. Disconnect Prisma first
    if (app) {
      const prisma = app.get(PrismaService);
      await prisma.$disconnect().catch(() => undefined);
      await app.close();
    }
    // 2. Drain and close the pool
    await pool?.end().catch(() => undefined);
    // 3. Then stop the container
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
