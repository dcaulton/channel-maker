import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { BACKGROUND_QUEUE } from '../src/jobs/jobs.constants';

export async function closeNestApp(app?: INestApplication) {
  if (!app) return;
  try {
    const queue = app.get<Queue>(getQueueToken(BACKGROUND_QUEUE));
    await queue.close();
  } catch {
    // This app may not have registered the queue.
  }
  await app.close();
}
