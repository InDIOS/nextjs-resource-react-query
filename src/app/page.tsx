'use client';
import Product from '@/lib/resources/Product';
import { useController, useDLE } from '@/lib/hooks/useRequest';

export default function Home() {
  const { data, loading } = useDLE(Product.list(), null);
  const { data: product, loading: loadingProduct } = useDLE(Product.detail(), {
    id: 'e671',
  });
  const { fetch, invalidate } = useController();

  return (
    <main>
      <h1>Product with Id e671: {product?.title}</h1>
      <button
        className="border border-solid border-white"
        onClick={async () => {
          try {
            await fetch(
              Product.partialUpdate(),
              { id: 'e671' },
              { title: 'New product' }
            );
            invalidate(Product.getKey(), {}, true);
          } catch (error) {
            console.log(error);
          }
        }}
      >
        New Product
      </button>
      <ul>
        {data?.map((product) => (
          <li key={product.id}>
            {product.id}. <span>{product.title}</span>
          </li>
        ))}
        {loading || loadingProduct ? <li>Loading...</li> : null}
      </ul>
    </main>
  );
}
