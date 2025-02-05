import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RequestBody, requestFn, RequestOptions, Parameters } from '../request';

export function useController() {
  const queryClient = useQueryClient();

  const { mutateAsync } = useMutation(
    {
      mutationFn: async ({
        req,
        params,
        reqBody,
      }: {
        req: RequestOptions<unknown>;
        params: Parameters;
        reqBody?: RequestBody;
      }) => {
        const { url, headers: rawHeaders, method, responseType } = req;
        const urlFull = params !== null ? url(params) : '';
        return requestFn(urlFull, method, rawHeaders, responseType)(reqBody);
      },
      onSuccess: (_, { req, params }) => {
        queryClient.invalidateQueries({
          queryKey: [req.key(), ...(params ? [params] : [])],
        });
      },
      // TODO: Add support for Optimistic Updates
    },
    queryClient
  );

  const fetch = async <Data>(
    req: RequestOptions<Data>,
    params: Parameters,
    reqBody?: RequestBody
  ) => {
    const { url, headers: rawHeaders, method, responseType, key } = req;
    const urlFull = params !== null ? url(params) : '';

    if (method === 'GET') {
      return (await queryClient.fetchQuery({
        queryKey: [key(), ...(params ? [params] : [])],
        queryFn: requestFn(urlFull, method, rawHeaders, responseType),
      })) as Data;
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
