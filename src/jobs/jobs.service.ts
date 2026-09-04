import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BACKGROUND_QUEUE, JOB_INGEST, JOB_LLM_STUB } from './jobs.constants';
import { EnqueueIngestDto } from './dto/enqueue-ingest.dto';
import { EnqueueLlmDto } from './dto/enqueue-llm.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(BACKGROUND_QUEUE) private readonly background: Queue,
  ) {}

  enqueueIngest(dto: EnqueueIngestDto) {
    return this.background.add(
      JOB_INGEST,
      {
        root: dto.root ?? '/mnt/nas/media',
        dryRun: dto.dryRun ?? true,
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
}
