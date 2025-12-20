import { Repository } from './repository';
import { Injectable } from '@nestjs/common';
import { JsonDB } from 'node-json-db';

@Injectable()
export class JsonRepository<T> implements Repository<T> {
  private constructor(private jsonDataBase: JsonDB) {}

  static async create(jsonDataBase: JsonDB) {
    await jsonDataBase.load();
    return new JsonRepository(jsonDataBase);
  }

  async save(key: string, data: T | T[]) {
    await this.jsonDataBase.push(`/${key}`, data);
    await this.jsonDataBase.save();
  }

  async find(key: string): Promise<T> {
    try {
      return await this.jsonDataBase.getObject(`/${key}`);
    } catch (e) {
      if (e.message.includes(`Can't find dataPath`)) {
        return null;
      }
      throw e;
    }
  }

  async delete(key: string) {
    await this.jsonDataBase.delete(`/${key}`);
  }
}
