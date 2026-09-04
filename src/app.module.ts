import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ChannelsModule } from './channels/channels.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleSlotsModule } from './schedule-slots/schedule-slots.module';
import { MediaAssetsModule } from './media-assets/media-assets.module';
import { WorksModule } from './works/works.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { RulesetsModule } from './rulesets/rulesets.module';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JobsModule } from './jobs/jobs.module';
import { redisConnection } from './jobs/redis.connection';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      connection: redisConnection(),
    }),
    JobsModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        autoLogging: true, // one request line per HTTP call
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
      },
    }),
    PrismaModule,
    ChannelsModule,
    ScheduleSlotsModule,
    MediaAssetsModule,
    WorksModule,
    SchedulerModule,
    RulesetsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
