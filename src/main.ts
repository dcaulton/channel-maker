import { otelSDK } from './instrumentation';
otelSDK.start();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Channel Maker API')
    .setDescription(
      'Virtual television station engine — channels, schedules, and more',
    )
    .setVersion('0.1.0')
    .addTag('channels')
    .addTag('schedule-slots')
    .addTag('media-assets')
    .addTag('works')
    .addTag('rulesets')
    .addTag('rules')
    .addTag('channel-rulesets')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
