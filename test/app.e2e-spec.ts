import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let redis: StartedRedisContainer;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    redis = await new RedisContainer('redis:7-alpine')
      .withStartupTimeout(120_000)
      .start();
    process.env.REDIS_URL = redis.getConnectionUrl();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await redis.stop();
    await app.close();
  });
});
