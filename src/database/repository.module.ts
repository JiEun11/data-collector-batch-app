import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JsonRepository } from './json-repository';
import { Config, JsonDB } from 'node-json-db';

export const JSON_REPOSITORY = Symbol('JSON_REPOSITORY');

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    /**
     * 샘플로 작성한 repository 입니다.
     * 해당 repository를 그대로 사용하지 않고, 변형하셔도 좋습니다.
     */
    {
      provide: JSON_REPOSITORY,
      useFactory: async () =>
        await JsonRepository.create(
          new JsonDB(
            new Config(`${__dirname}/batch-database`, true, false, '/'),
          ),
        ),
    },
  ],
  exports: [JSON_REPOSITORY],
})
export class RepositoryModule {}
