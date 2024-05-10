export default async function asyncIterableToArray<T>(asyncIterable: AsyncIterable<T>): Promise<T[]> {
  const array: T[] = [];

  for await (const item of asyncIterable) {
    array.push(item);
  }

  return array;
}
