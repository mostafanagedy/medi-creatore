import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const requestId = (request.headers['x-request-id'] as string) ?? uuidv4();
    request.headers['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);

    const start = Date.now();
    const { method, url, ip } = request;
    const userId = (request.user as { id?: string } | undefined)?.id;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const statusCode = response.statusCode;
          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms | userId=${userId ?? 'anon'} ip=${ip} requestId=${requestId}`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          this.logger.warn(
            `${method} ${url} ERROR ${duration}ms | ${error.message} | requestId=${requestId}`,
          );
        },
      }),
    );
  }
}
