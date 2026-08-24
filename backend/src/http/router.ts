import type { IncomingMessage, ServerResponse } from 'node:http';
import { notFound } from './errors.js';

export interface RouteContext {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  params: Record<string, string>;
}

export type RouteHandler = (context: RouteContext) => Promise<void> | void;

interface Route {
  method: string;
  pattern: RegExp;
  parameterNames: string[];
  handler: RouteHandler;
}

export class Router {
  private readonly routes: Route[] = [];

  public add(method: string, path: string, handler: RouteHandler): void {
    const parameterNames: string[] = [];
    const segments = path.split('/').map((segment) => {
      if (segment.startsWith(':')) {
        parameterNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return escapeRegExp(segment);
    });
    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^${segments.join('/')}/?$`),
      parameterNames,
      handler,
    });
  }

  public async dispatch(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://internal');
    const method = (request.method ?? 'GET').toUpperCase();
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = route.pattern.exec(url.pathname);
      if (!match) continue;
      const params: Record<string, string> = {};
      route.parameterNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]!);
      });
      await route.handler({ request, response, url, params });
      return;
    }
    throw notFound('API route not found');
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
