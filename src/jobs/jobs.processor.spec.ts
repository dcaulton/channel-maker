import { JobsProcessor } from './jobs.processor';
import {
  EVENT_INGEST_COMPLETED,
  EVENT_INGEST_FILE,
  EVENT_LLM_COMPLETED,
  JOB_INGEST,
  JOB_LLM_STUB,
} from './jobs.constants';

describe('JobsProcessor', () => {
  let processor: JobsProcessor;
  let events: { emit: jest.Mock };

  beforeEach(() => {
    events = { emit: jest.fn() };
    processor = new JobsProcessor(events as never);
  });

  it('scans three stub files and emits ingest events', async () => {
    const job = {
      id: 'job-1',
      name: JOB_INGEST,
      data: { root: '/media', dryRun: true },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    };

    const result = await processor.process(job as never);

    expect(result).toEqual({ scanned: 3, dryRun: true });
    expect(events.emit).toHaveBeenCalledTimes(4);
    expect(events.emit).toHaveBeenCalledWith(
      EVENT_INGEST_FILE,
      expect.objectContaining({
        jobId: 'job-1',
        filePath: '/media/show-a/S01E01.mkv',
        dryRun: true,
      }),
    );
    expect(events.emit).toHaveBeenLastCalledWith(
      EVENT_INGEST_COMPLETED,
      expect.objectContaining({ jobId: 'job-1', scanned: 3 }),
    );
  });

  it('returns a stub synopsis for llm jobs', async () => {
    const job = {
      id: 'job-2',
      name: JOB_LLM_STUB,
      data: { workId: 'work-9', prompt: 'one line' },
    };

    const result = await processor.process(job as never);

    expect(result).toEqual({
      workId: 'work-9',
      synopsis: 'STUB: one line for work-9',
    });
    expect(events.emit).toHaveBeenCalledWith(
      EVENT_LLM_COMPLETED,
      expect.objectContaining({ workId: 'work-9', jobId: 'job-2' }),
    );
  });

  it('rejects unknown job names', async () => {
    await expect(
      processor.process({ id: 'x', name: 'nope', data: {} } as never),
    ).rejects.toThrow('Unknown job name: nope');
  });
});
