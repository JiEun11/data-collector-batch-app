import { Module } from '@nestjs/common';
import { BatchService } from './batch.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RepositoryModule } from '../database/repository.module';

@Module({
  imports: [ScheduleModule.forRoot(), RepositoryModule],
  providers: [BatchService],
})
export class BatchModule {}
