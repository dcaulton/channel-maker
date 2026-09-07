import { JobsProcessor } from './jobs.processor';
import {
  EVENT_INGEST_COMPLETED,
  EVENT_LLM_COMPLETED,
  JOB_INGEST,
  JOB_LLM_STUB,
} from './jobs.constants';

describe('JobsProcessor', () => {
  let processor: JobsProcessor;
  let events: { emit: jest.Mock };
  let ingest: { ingest: jest.Mock };
  let tvhSync: { sync: jest.Mock };

  beforeEach(() => {
    events = { emit: jest.fn() };
    ingest = { ingest: jest.fn() };
    tvhSync = { sync: jest.fn() };
    processor = new JobsProcessor(
      events as never,
      tvhSync as never,
      ingest as never,
    );
  });

  it('delegates ingest jobs and emits completed', async () => {
    ingest.ingest.mockResolvedValue({
      root: '/media',
      scanned: 3,
      upserted: 0,
      skipped: 3,
      dryRun: true,
    });

    const job = {
      id: 'job-1',
      name: JOB_INGEST,
      data: { root: '/media', dryRun: true },
      updateProgress: jest.fn(),
    };

    const result = await processor.process(job as never);

    expect(ingest.ingest).toHaveBeenCalledWith({
      root: '/media',
      dryRun: true,
      publicBase: undefined,
    });
    expect(result).toEqual(
      expect.objectContaining({ scanned: 3, dryRun: true }),
    );
    expect(events.emit).toHaveBeenCalledWith(
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
