import { Module } from '@nestjs/common';
import { BatchLoggerService } from './batch-logger.service';
import { RepositoryModule } from '../database/repository.module';

@Module({
  imports: [RepositoryModule],
  providers: [BatchLoggerService],
  exports: [BatchLoggerService],
})
export class LogModule { }
