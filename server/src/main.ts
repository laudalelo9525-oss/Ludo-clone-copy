import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { type HttpConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const { port, corsOrigins } = app.get(ConfigService).getOrThrow<HttpConfig>('http');

  app.enableCors({ origin: corsOrigins, credentials: true });

  // Lets Colyseus and future DB/Redis connections close cleanly on SIGTERM.
  app.enableShutdownHooks();

  await app.listen(port);
  Logger.log(`REST gateway listening on ${await app.getUrl()}`, 'Bootstrap');
}

void bootstrap().catch((error: unknown) => {
  Logger.error('Failed to start LudoVerse server', error, 'Bootstrap');
  process.exitCode = 1;
});
