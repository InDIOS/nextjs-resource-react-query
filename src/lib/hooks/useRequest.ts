// TODO: Add support for parallel requests
// TODO: Add support for more configurations
// TODO: Add support for polling configuration
// TODO: Add support for a hook to handle Suspense

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
    ...(_req.current.update
      ? {
          // When mutate is called:
          onMutate: async (newData) => {
            const [updateKey, updateFn] = _req.current?.update?.(newData) as [
              string,
              (data: unknown) => unknown
            ];
            // Cancel any outgoing refetches
            // (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: [updateKey] });

            // Snapshot the previous value
            const previousData = queryClient.getQueryData([updateKey]);

            // Optimistically update to the new value
            queryClient.setQueryData([updateKey], updateFn);

            // Return a context with the previous and new todo
            return { previousData, newData };
          },
          // If the mutation fails, use the context we returned above
          onError: (err, newData, context) => {
            const [updateKey] = _req.current?.update?.(newData) as [
              string,
              (data: unknown) => unknown
            ];
            queryClient.setQueryData([updateKey], context?.previousData);
          },
          // Always refetch after error or success:
          onSettled: (newData) => {
            const [updateKey] = _req.current?.update?.(newData) as [
              string,
              (data: unknown) => unknown
            ];
            queryClient.invalidateQueries({ queryKey: [updateKey] });
          },
        }
      : {}),
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
