import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BACKGROUND_QUEUE,
  JOB_FILL_SCHEDULE,
  JOB_INGEST,
  JOB_LLM_STUB,
  JOB_TVH_SYNC,
} from './jobs.constants';
import { EnqueueIngestDto } from './dto/enqueue-ingest.dto';
import { EnqueueLlmDto } from './dto/enqueue-llm.dto';
import { EnqueueFillDto } from './dto/enqueue-fill.dto';
import { EnqueueTvhSyncDto } from './dto/enqueue-tvh-sync.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(BACKGROUND_QUEUE) private readonly background: Queue,
  ) {}

  enqueueFill(dto: EnqueueFillDto) {
    return this.background.add(
      JOB_FILL_SCHEDULE,
      { channelSlug: dto.channelSlug, dryRun: false },
      { repeat: { every: 60 * 60 * 1000 }, jobId: `fill-${dto.channelSlug}` },
    );
  }

  enqueueIngest(dto: EnqueueIngestDto) {
    return this.background.add(
      JOB_INGEST,
      {
        root: dto.root ?? '/mnt/nas/media',
        dryRun: dto.dryRun ?? true,
        publicBase: dto.publicBase ?? '',
      },
      { removeOnComplete: 50, removeOnFail: 50 },
    );
  }

  enqueueLlm(dto: EnqueueLlmDto) {
    return this.background.add(
      JOB_LLM_STUB,
      {
        workId: dto.workId,
        prompt: dto.prompt ?? 'stub synopsis',
      },
      { removeOnComplete: 50, removeOnFail: 50 },
    );
  }

  enqueueTvhSync(dto: EnqueueTvhSyncDto) {
    return this.background.add(
      JOB_TVH_SYNC,
      { dryRun: dto.dryRun ?? false },
      { removeOnComplete: 50, removeOnFail: 50 },
    );
  }
}
