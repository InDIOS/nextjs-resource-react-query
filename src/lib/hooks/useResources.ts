import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import { RequestOptions, Parameters, requestFn } from '../request';

export function useResources<T extends unknown[]>(
  ...resources: { [K in keyof T]: [RequestOptions<T[K]>, Parameters] }
): {
  [K in keyof T]: T[K] | undefined;
} {
  const queryClient = useQueryClient();

  const queries = useSuspenseQueries(
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

  return queries.map((query) => query.data) as {
    [K in keyof T]: T[K] | undefined;
  };
}
