// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JestMockOf<T extends (...args: any[]) => any> = jest.Mock<
  ReturnType<T>,
  Parameters<T>,
  ThisParameterType<T>
>;
