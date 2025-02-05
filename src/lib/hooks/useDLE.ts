import { useQuery, useQueryClient } from '@tanstack/react-query';
import { requestFn, RequestOptions, Parameters } from '../request';

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
    refetch: reload,
  } = useQuery<Data>(
    {
      enabled: !!urlFull,
      queryKey: [key(), ...(params ? [params] : [])],
      queryFn: requestFn(urlFull, method, rawHeaders, responseType),
      staleTime: !req.pollFrequency ? req.dataExpiryLength : void 0,
    },
    queryClient
  );

  return { data, loading, error, reload };
}
