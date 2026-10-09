import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { REDIS_IMAGE } from './images';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let redis: StartedRedisContainer;

  beforeAll(async () => {
    redis = await new RedisContainer(REDIS_IMAGE)
      .withStartupTimeout(120_000)
      .start();
    process.env.REDIS_URL = redis.getConnectionUrl();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 180_000);

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  afterAll(async () => {
    await app?.close();
    await redis?.stop();
  }, 60_000);
});
