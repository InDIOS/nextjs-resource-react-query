import { Resource } from '../Resource';

export default class Product extends Resource {
  readonly id: string = '';
  readonly title: string = '';
  readonly image: string = '';
  readonly price: number = 0;
  readonly description: string = '';
  readonly category: string = '';
  readonly rating: { rate: number; count: number } = { rate: 0, count: 0 };

  static urlRoot = 'http://localhost:8000/products';
  static resourceName = 'product';
}
