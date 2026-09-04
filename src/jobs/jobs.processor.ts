import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import {
  BACKGROUND_QUEUE,
  EVENT_INGEST_COMPLETED,
  EVENT_INGEST_FILE,
  EVENT_LLM_COMPLETED,
  JOB_INGEST,
  JOB_LLM_STUB,
} from './jobs.constants';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

@Processor(BACKGROUND_QUEUE)
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(private readonly events: EventEmitter2) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === JOB_INGEST) {
      return this.runIngestStub(job);
    }
    if (job.name === JOB_LLM_STUB) {
      return this.runLlmStub(job);
    }
    throw new Error(`Unknown job name: ${job.name}`);
  }

  private async runIngestStub(job: Job<{ root: string; dryRun: boolean }>) {
    const files = [
      `${job.data.root}/show-a/S01E01.mkv`,
      `${job.data.root}/show-a/S01E02.mkv`,
      `${job.data.root}/show-b/S01E01.mkv`,
    ];

    for (const filePath of files) {
      await sleep(300);
      await job.updateProgress({ filePath });
      this.events.emit(EVENT_INGEST_FILE, {
        jobId: job.id,
        filePath,
        dryRun: job.data.dryRun,
      });
      this.logger.log(
        { filePath, dryRun: job.data.dryRun },
        'ingest stub file',
      );
    }

    const result = { scanned: files.length, dryRun: job.data.dryRun };
    this.events.emit(EVENT_INGEST_COMPLETED, {
      jobId: job.id,
      ...result,
    });
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
