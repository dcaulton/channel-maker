import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENT_INGEST_COMPLETED,
  EVENT_INGEST_FILE,
  EVENT_LLM_COMPLETED,
} from './jobs.constants';

@Injectable()
export class JobsEvents {
  private readonly logger = new Logger(JobsEvents.name);

  @OnEvent(EVENT_INGEST_FILE)
  onIngestFile(payload: { jobId: string; filePath: string; dryRun: boolean }) {
    this.logger.log(payload, EVENT_INGEST_FILE);
  }

  @OnEvent(EVENT_INGEST_COMPLETED)
  onIngestCompleted(payload: {
    jobId: string;
    scanned: number;
    dryRun: boolean;
  }) {
    this.logger.log(payload, EVENT_INGEST_COMPLETED);
  }

  @OnEvent(EVENT_LLM_COMPLETED)
  onLlmCompleted(payload: { jobId: string; workId: string; synopsis: string }) {
    this.logger.log(payload, EVENT_LLM_COMPLETED);
  }
}
