// common/context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private readonly context: RequestContextService) {}

  use(req: any, res: any, next: () => void) {
    const store = new Map<string, any>();
    this.context.run(next, store);
  }
}
