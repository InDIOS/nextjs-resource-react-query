import { RequestOptions, Parameters } from './request';

export type ResourceOptions = {
  dataExpiryLength?: number;
  pollFrequency?: number;
};

const getQueryParams = (params?: Parameters) => {
  const rawParams = Object.keys(params ?? {}).map((key) => [
    key,
    `${params?.[key]}`,
  ]);
  return rawParams.length ? `?${new URLSearchParams(rawParams)}` : '';
};

const urlBase =
  (url: string) =>
  ({ id, ...query }: Parameters) =>
    `${url}/${id}${getQueryParams(query)}`;

export class Resource {
  static urlRoot: string;
  static resourceName: string;

  static getKey(params?: Parameters) {
    return `${this.resourceName}:${this.getUrl(params)}`;
  }

  static getUrl(params?: Parameters) {
    return `${this.urlRoot}${getQueryParams(params)}`;
  }

  static resourceOptions(): ResourceOptions {
    return {
      dataExpiryLength: 5 * 60 * 1000,
    };
  }

  static requestParams<T>() {
    const key = () => this.getKey();
    const baseOptions: RequestOptions<T> = {
      key,
      model: this,
      method: 'GET',
      responseType: 'json',
      extend: (options: Partial<RequestOptions<T>>) =>
        Object.assign(baseOptions, options),
      headers: { 'Content-Type': 'application/json' },
      url: (params?: Parameters) => this.getUrl(params),
      ...this.resourceOptions(),
    };

    return baseOptions;
  }

  static list<
    T extends typeof Resource = typeof this,
    R = InstanceType<typeof this>
  >(this: T) {
    return this.requestParams<R[]>();
  }

  static detail<
    T extends typeof Resource = typeof this,
    R = InstanceType<typeof this>
  >(this: T) {
    return this.requestParams<R>().extend({
      url: urlBase(this.urlRoot),
    });
  }

  static create<
    T extends typeof Resource = typeof this,
    R = InstanceType<typeof this>
  >(this: T) {
    return { ...this.requestParams<R>(), method: 'POST' };
  }

  static partialUpdate<
    T extends typeof Resource = typeof this,
    R = InstanceType<typeof this>
  >(this: T) {
    return this.requestParams<R>().extend({
      method: 'PATCH',
      url: urlBase(this.urlRoot),
    });
  }

  static update<
    T extends typeof Resource = typeof this,
    R = InstanceType<typeof this>
  >(this: T) {
    return this.requestParams<R>().extend({
      method: 'PUT',
      url: urlBase(this.urlRoot),
    });
  }

  static delete<
    T extends typeof Resource = typeof this,
    R = InstanceType<typeof this>
  >(this: T) {
    return this.requestParams<R>().extend({
      method: 'DELETE',
      url: urlBase(this.urlRoot),
    });
  }
}
