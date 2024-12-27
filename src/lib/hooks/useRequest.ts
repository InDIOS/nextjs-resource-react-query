import { getQueryClient } from '../queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { RequestOptions, Parameters } from '../Resource';
import { useRef } from 'react';

const queryClient = getQueryClient();

type RequestBody = Record<string, unknown> | RequestInit['body'];

const getQueryFn =
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
      Object.prototype.toString.call(reqBody).slice(8, -1).toLowerCase() ===
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

export function useDLE<Data>(
  req: RequestOptions<Data>,
  params: Parameters | null
) {
  const { url, headers: rawHeaders, method, responseType, key } = req;
  const urlFull = params !== null ? url(params) : '';

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery<Data>(
    {
      enabled: !!urlFull,
      queryKey: [key(), ...(params ? [params] : [])],
      queryFn: () => getQueryFn(urlFull, method, rawHeaders, responseType)(),
    },
    queryClient
  );

  return { data, loading, error };
}

export function useController() {
  const _params = useRef<Parameters>({});
  const _req = useRef({} as unknown as RequestOptions<unknown>);

  const mutation = useMutation({
    mutationFn: (reqBody?: RequestBody) => {
      const { url, headers: rawHeaders, method, responseType } = _req.current;
      return getQueryFn(
        url(_params.current),
        method,
        rawHeaders,
        responseType
      )(reqBody);
    },
  });

  return {
    fetch: async <Data>(
      req: RequestOptions<Data>,
      params: Parameters,
      reqBody: RequestBody
    ) => {
      if (req.method === 'GET') {
        console.warn(
          'GET request on this method is not supported yet. Use invalidate instead.'
        );
        return;
      }
      _req.current = req;
      _params.current = params;
      try {
        return (await mutation.mutateAsync(reqBody)) as Data;
      } catch (error) {
        throw error;
      }
    },
    invalidate: (key: string, params?: Parameters, exact = false) =>
      queryClient.invalidateQueries({
        queryKey: [key, ...(params ? [params] : [])],
        exact,
      }),
  };
}
