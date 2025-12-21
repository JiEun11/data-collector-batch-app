import { Module } from '@nestjs/common';
import { BatchService } from './batch.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RepositoryModule } from '../database/repository.module';
import { LogModule } from '../log/log.module';
@Module({
  imports: [ScheduleModule.forRoot(), RepositoryModule, LogModule],
  providers: [BatchService],
})
export class BatchModule { }
