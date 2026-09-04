import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { EnqueueIngestDto } from './dto/enqueue-ingest.dto';
import { EnqueueLlmDto } from './dto/enqueue-llm.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Enqueue a stub NAS ingest job' })
  @ApiCreatedResponse({ description: 'Job queued' })
  async ingest(@Body() dto: EnqueueIngestDto) {
    const job = await this.jobsService.enqueueIngest(dto);
    return { id: job.id, name: job.name, queue: job.queueName };
  }

  @Post('llm-stub')
  @ApiOperation({ summary: 'Enqueue a stub LLM enrich job' })
  @ApiCreatedResponse({ description: 'Job queued' })
  async llm(@Body() dto: EnqueueLlmDto) {
    const job = await this.jobsService.enqueueLlm(dto);
    return { id: job.id, name: job.name, queue: job.queueName };
  }
}
