import { useResources } from './useResources';
import { RequestOptions, Parameters } from '../request';

export function useResource<T>(req: RequestOptions<T>, params: Parameters) {
  const [data] = useResources([req, params]);
  return data;
}
