export interface Repository<T> {
  save(key: string, data: T): Promise<void>;
  find(key: string): Promise<T>;
  delete(key: string): Promise<void>;
}
