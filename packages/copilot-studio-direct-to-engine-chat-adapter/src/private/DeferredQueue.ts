import { DeferredPromise } from 'powerva-turn-based-chat-adapter-framework';

export default class DeferredQueue<T> {
  constructor() {
    this.#deferred = new DeferredPromise();
    this.#deferred.promise.catch(() => {});
  }

  #deferred: DeferredPromise<void>;
  #queue: T[] = [];

  public get promise(): Promise<T> {
    const value = this.#queue.shift();

    return value
      ? Promise.resolve(value)
      : this.#deferred.promise.then(() => {
          const value = this.#queue.shift();

          if (!value) {
            throw new Error('No item to dequeue.');
          }

          return value;
        });
  }

  public push(value: T) {
    this.#queue.push(value);
    this.#deferred.resolve();
    this.#deferred = new DeferredPromise();
    this.#deferred.promise.catch(() => {});
  }

  public reject(error: unknown) {
    this.#deferred.reject(error);
  }
}
