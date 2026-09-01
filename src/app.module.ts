import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
