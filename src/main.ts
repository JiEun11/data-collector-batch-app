import { NestFactory } from '@nestjs/core';
import { BatchModule } from './batch/batch.module';

async function bootstrap() {
  const app = await NestFactory.create(BatchModule);
  await app.init();
}
bootstrap();
