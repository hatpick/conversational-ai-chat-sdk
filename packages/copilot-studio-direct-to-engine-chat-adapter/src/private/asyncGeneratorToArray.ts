import iterateWithReturnValue from './iterateWithReturnValueAsync';

export default async function asyncGeneratorToArray<T, U>(asyncGenerator: AsyncGenerator<T, U>): Promise<[T[], U]> {
  const array: T[] = [];
  const [iterator, getReturnValue] = iterateWithReturnValue(asyncGenerator);

  for await (const item of iterator) {
    array.push(item);
  }

  return [array, getReturnValue()];
}
