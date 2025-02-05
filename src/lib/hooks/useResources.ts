import { useQueries, useQueryClient } from '@tanstack/react-query';
import { RequestOptions, Parameters, requestFn } from '../request';

// TODO: Add support for a hook to handle Suspense
export function useResources<T extends unknown[]>(
  ...resources: { [K in keyof T]: [RequestOptions<T[K]>, Parameters] }
): {
  [K in keyof T]: {
    data: T[K] | undefined;
    loading: boolean;
    error: Error | null;
  };
} {
  const queryClient = useQueryClient();

  const queries = useQueries(
    {
      queries: resources.map((resource) => {
        const [req, params] = resource;
        const {
          url,
          headers: rawHeaders,
          method,
          responseType,
          key,
          pollFrequency,
        } = req;
        const urlFull = params !== null ? url(params) : '';

        return {
          enabled: !!urlFull,
          refetchInterval: pollFrequency,
          queryKey: [key(), ...(params ? [params] : [])],
          queryFn: requestFn(urlFull, method, rawHeaders, responseType),
          staleTime: !req.pollFrequency ? req.dataExpiryLength : void 0,
        };
      }),
    },
    queryClient
  );

  return queries.map((query) => ({
    data: query.data,
    loading: query.isLoading,
    error: query.error,
  })) as {
    [K in keyof T]: {
      data: T[K] | undefined;
      loading: boolean;
      error: Error | null;
    };
  };
}
