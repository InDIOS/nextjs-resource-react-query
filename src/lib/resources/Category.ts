import { Resource } from '../Resource';

export default class Category extends Resource {
  readonly id: string = '';
  readonly name: string = '';
  readonly description: string = '';

  static urlRoot = 'http://localhost:8000/categories';
  static resourceName = 'category';
}
