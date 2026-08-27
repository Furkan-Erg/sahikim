import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getCorsOrigin } from './cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: getCorsOrigin() });
  await app.listen(3000);
}

bootstrap();
