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
      // When mutate is called:
      onMutate: async ({ req, params, reqBody }) => {
        const { key } = req;
        // Cancel any outgoing fetches
        // (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({
          queryKey: [key(), ...(params ? [params] : [])],
        });

        // Snapshot the previous value
        const previousData = queryClient.getQueryData([
          key(),
          ...(params ? [params] : []),
        ]);

        // Optimistically update to the new value
        queryClient.setQueryData(
          [key(), ...(params ? [params] : [])],
          (old: unknown) => req.update?.(old, reqBody)
        );

        // Return a context with the previous and new todo
        return { previousData };
      },
      // If the mutation fails, use the context we returned above
      onError: (_, { req, params }, context) => {
        queryClient.setQueryData(
          [req.key(), ...(params ? [params] : [])],
          context?.previousData
        );
      },
      // Always refetch after error or success:
      onSettled: (_, __, { req, params }) => {
        queryClient.invalidateQueries({
          queryKey: [req.key(), ...(params ? [params] : [])],
        });
      },
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
        staleTime: 500,
        queryKey: [key(), ...(params ? [params] : [])],
        queryFn: requestFn(urlFull, method, rawHeaders, responseType),
      })) as Data;
    }

    return mutateAsync({ req, params, reqBody }) as Data;
  };

  const invalidate = (key: string, params?: Parameters, exact = true) =>
    queryClient.invalidateQueries({
      queryKey: [key, ...(params ? [params] : [])],
      exact,
    });

  return { fetch, invalidate };
}
