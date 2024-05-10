export type ResultOfPromise<T extends Promise<unknown>> = T extends Promise<infer P> ? P : never;
