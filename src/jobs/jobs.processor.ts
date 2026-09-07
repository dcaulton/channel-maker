import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { TvhSyncService } from '../tvheadend/tvh-sync.service';
import { IngestService } from '../ingest/ingest.service';
import {
  BACKGROUND_QUEUE,
  EVENT_INGEST_COMPLETED,
  EVENT_LLM_COMPLETED,
  EVENT_TVH_COMPLETED,
  JOB_INGEST,
  JOB_LLM_STUB,
  JOB_TVH_SYNC,
} from './jobs.constants';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

@Processor(BACKGROUND_QUEUE)
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    private readonly events: EventEmitter2,
    private readonly tvhSync: TvhSyncService,
    private readonly ingest: IngestService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log({ name: job.name, id: job.id }, 'ready to process job');
    if (job.name === JOB_INGEST) {
      return this.runIngest(job);
    }
    if (job.name === JOB_LLM_STUB) {
      return this.runLlmStub(job);
    }
    if (job.name === JOB_TVH_SYNC) {
      const result = await this.tvhSync.sync({
        dryRun: Boolean(job.data.dryRun),
      });
      this.events.emit(EVENT_TVH_COMPLETED, { jobId: job.id, ...result });
      return result;
    }
    throw new Error(`Unknown job name: ${job.name}`);
  }

  private async runIngest(
    job: Job<{
      root: string;
      dryRun: boolean;
      publicBase?: string;
    }>,
  ) {
    const result = await this.ingest.ingest({
      root: job.data.root,
      dryRun: job.data.dryRun,
      publicBase: job.data.publicBase,
    });
    this.events.emit(EVENT_INGEST_COMPLETED, { jobId: job.id, ...result });
    return result;
  }

  private async runLlmStub(job: Job<{ workId: string; prompt: string }>) {
    await sleep(500);
    const result = {
      workId: job.data.workId,
      synopsis: `STUB: ${job.data.prompt} for ${job.data.workId}`,
    };
    this.events.emit(EVENT_LLM_COMPLETED, { jobId: job.id, ...result });
    this.logger.log(result, 'llm stub completed');
    return result;
  }
}
