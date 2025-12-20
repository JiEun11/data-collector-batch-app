import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class BatchService implements OnApplicationBootstrap {
  @Cron('0 */10 * * * *')
  async run() {
    //TODO: 비지니스 로직을 작성해주세요.
    console.log('10분마다 정기적으로 실행되는 코드 입니다.');
  }

  onApplicationBootstrap() {
    this.run();
  }
}
