import iterateWithReturnValue from './iterateWithReturnValue';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function asyncGeneratorToArray<T, TReturn = any>(
  asyncGenerator: AsyncGenerator<T, TReturn>
): Promise<[T[], TReturn]> {
  const array: T[] = [];
  const [iterator, getReturnValue] = iterateWithReturnValue(asyncGenerator);

  for await (const item of iterator) {
    array.push(item);
  }

  return [array, getReturnValue()];
}
