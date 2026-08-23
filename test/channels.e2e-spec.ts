import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Wait } from 'testcontainers';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type ChannelResponse = {
  id: string;
  name: string;
  slug: string;
  slots?: unknown[];
  _count?: { slots: number };
};

describe('Channels + ScheduleSlots (e2e)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;

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

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 180_000);

  afterAll(async () => {
    if (app) {
      const prisma = app.get(PrismaService);
      await prisma.$disconnect().catch(() => undefined);
      await app.close();
    }
    await container?.stop().catch(() => undefined);
  });

  it('CRUD channel and attach a schedule slot', async () => {
    const createChannel = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/channels')
      .send({
        name: 'Classic Movies',
        slug: 'classic-movies',
        description: 'Golden age films',
      })
      .expect(201);

    const channel = createChannel.body as ChannelResponse;
    const channelId = channel.id;
    expect(channelId).toBeDefined();

    const list = await request(app.getHttpServer())
      .get('/channels')
      .expect(200);
    expect(list.body[0]._count.slots).toBe(0);

    const createSlot = await request(app.getHttpServer())
      .post('/schedule-slots')
      .send({
        channelId,
        title: 'Night Owl Cinema',
        description: 'Noir double feature',
        startsAt: '2026-08-23T23:00:00.000Z',
        endsAt: '2026-08-24T01:00:00.000Z',
      })
      .expect(201);

    expect(createSlot.body.title).toBe('Night Owl Cinema');

    const one = await request(app.getHttpServer())
      .get(`/channels/${channelId}`)
      .expect(200);

    expect(one.body.slots).toHaveLength(1);
    expect(one.body._count.slots).toBe(1);

    await request(app.getHttpServer())
      .delete(`/schedule-slots/${createSlot.body.id}`)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/channels/${channelId}`)
      .expect(204);
  });

  it('rejects invalid schedule range', async () => {
    const channel = await request(app.getHttpServer())
      .post('/channels')
      .send({ name: 'Temp', slug: 'temp-range' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/schedule-slots')
      .send({
        channelId: channel.body.id,
        title: 'Bad',
        startsAt: '2026-08-24T01:00:00.000Z',
        endsAt: '2026-08-23T23:00:00.000Z',
      })
      .expect(400);
  });
});
