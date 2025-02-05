import { ResourceOptions } from './Resource';

export type Parameters = Record<
  string,
  string | number | boolean | undefined | null
>;

export interface RequestOptions<T> extends ResourceOptions {
  url: (params: Parameters) => string;
  headers: Parameters;
  key: () => string;
  model: new (...args: unknown[]) => unknown;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD';
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer' | 'stream';
  extend: (options: Partial<RequestOptions<T>>) => RequestOptions<T>;
  update?: (data: unknown) => unknown;
}

export type RequestBody = Record<string, unknown> | RequestInit['body'];

export const requestFn =
  (
    url: string,
    method: RequestOptions<unknown>['method'],
    rawHeaders: RequestOptions<unknown>['headers'],
    responseType: RequestOptions<unknown>['responseType']
  ) =>
  async (reqBody?: RequestBody) => {
    const headers = new Headers(
      Object.keys(rawHeaders).map((key) => [key, `${rawHeaders[key]}`]) as [
        string,
        string
      ][]
    );

    const body =
      method === 'GET'
        ? undefined
        : Object.prototype.toString.call(reqBody).slice(8, -1).toLowerCase() ===
          'object'
        ? JSON.stringify(reqBody as Record<string, unknown>)
        : (reqBody as RequestInit['body']) ?? undefined;

    const res = await fetch(url, {
      method,
      headers,
      body,
    });

    if (res.ok) {
      const data =
        responseType === 'json'
          ? await res.json()
          : responseType === 'text'
          ? await res.text()
          : responseType === 'blob'
          ? await res.blob()
          : responseType === 'arraybuffer'
          ? await res.arrayBuffer()
          : responseType === 'stream'
          ? res.body
          : void 0;
      return data;
    } else {
      const message = await res.text();
      throw new Error(message);
    }
  };
