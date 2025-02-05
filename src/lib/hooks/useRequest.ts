// TODO: Add support for more configurations
// TODO: Add support for polling configuration
// TODO: Add support for a hook to handle Suspense

import { RequestOptions, Parameters } from '../Resource';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
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
      queryFn: getQueryFn(urlFull, method, rawHeaders, responseType),
    },
    queryClient
  );

  return { data, loading, error };
}

type ResourceParams<Data> = {
  req: RequestOptions<Data>;
  params: Parameters;
  reqBody?: RequestBody;
};

export function useController() {
  const queryClient = useQueryClient();

  const { mutateAsync } = useMutation({
    mutationFn: async ({ req, params, reqBody }: ResourceParams<unknown>) => {
      const { url, headers: rawHeaders, method, responseType } = req;
      const urlFull = params !== null ? url(params) : '';
      return getQueryFn(urlFull, method, rawHeaders, responseType)(reqBody);
    },
    onSuccess: (_, { req, params }) => {
      queryClient.invalidateQueries({
        queryKey: [req.key(), ...(params ? [params] : [])],
      });
    },
  });

  const fetch = async <Data>(
    req: RequestOptions<Data>,
    params: Parameters,
    reqBody?: RequestBody
  ) => {
    const { url, headers: rawHeaders, method, responseType, key } = req;
    const urlFull = params !== null ? url(params) : '';

    if (method === 'GET') {
      await queryClient.fetchQuery({
        queryKey: [key(), ...(params ? [params] : [])],
        queryFn: getQueryFn(urlFull, method, rawHeaders, responseType),
      });
      return;
    }

    return mutateAsync({ req, params, reqBody }) as Data;
  };

  const invalidate = (key: string, params?: Parameters, exact = false) =>
    queryClient.invalidateQueries({
      queryKey: [key, ...(params ? [params] : [])],
      exact,
    });

  return { fetch, invalidate };
}

export function useResources(
  ...resources: [RequestOptions<unknown>, Parameters][]
) {
  const queries = useQueries({
    queries: resources.map((resource) => {
      const [req, params] = resource;
      const { url, headers: rawHeaders, method, responseType, key } = req;
      const urlFull = params !== null ? url(params) : '';

      return {
        enabled: !!urlFull,
        queryKey: [key(), ...(params ? [params] : [])],
        queryFn: getQueryFn(urlFull, method, rawHeaders, responseType),
      };
    }),
  });

  return queries.map((query) => ({
    data: query.data,
    loading: query.isLoading,
    error: query.error,
  }));
}
