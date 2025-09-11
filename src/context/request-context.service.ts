// common/request-context.service.ts
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<Map<string, any>>();

  run(callback: () => void, initialStore: Map<string, any> = new Map()) {
    this.als.run(initialStore, callback);
  }

  set(key: string, value: any) {
    this.als.getStore()?.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.als.getStore()?.get(key);
  }

  // shortcut for user
  getUser<T = any>(): T | undefined {
    return this.get<T>('user');
  }
}
