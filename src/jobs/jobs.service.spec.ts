import { JobsService } from './jobs.service';
import { BACKGROUND_QUEUE, JOB_INGEST, JOB_LLM_STUB } from './jobs.constants';

describe('JobsService', () => {
  let service: JobsService;
  let queue: { add: jest.Mock };

  beforeEach(() => {
    queue = { add: jest.fn() };
    service = new JobsService(queue as never);
  });

  it('enqueues ingest with defaults', async () => {
    queue.add.mockResolvedValue({ id: '1', name: JOB_INGEST });

    await service.enqueueIngest({});

    expect(queue.add).toHaveBeenCalledWith(
      JOB_INGEST,
      { root: '/mnt/nas/media', dryRun: true },
      expect.objectContaining({ removeOnComplete: 50 }),
    );
  });

  it('enqueues ingest with the given root', async () => {
    queue.add.mockResolvedValue({ id: '2', name: JOB_INGEST });

    await service.enqueueIngest({ root: '/mnt/nas/tv', dryRun: false });

    expect(queue.add).toHaveBeenCalledWith(
      JOB_INGEST,
      { root: '/mnt/nas/tv', dryRun: false },
      expect.any(Object),
    );
  });

  it('enqueues the llm stub with workId', async () => {
    queue.add.mockResolvedValue({ id: '3', name: JOB_LLM_STUB });

    await service.enqueueLlm({ workId: 'work-1' });

    expect(queue.add).toHaveBeenCalledWith(
      JOB_LLM_STUB,
      { workId: 'work-1', prompt: 'stub synopsis' },
      expect.any(Object),
    );
    expect(BACKGROUND_QUEUE).toBe('background');
  });
});
