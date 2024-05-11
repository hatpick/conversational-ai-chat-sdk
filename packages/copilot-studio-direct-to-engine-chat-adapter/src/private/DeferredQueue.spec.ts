import DeferredQueue from './DeferredQueue';

let queue: DeferredQueue<number>;

beforeEach(() => {
  queue = new DeferredQueue();
});

describe('push 3 items', () => {
  beforeEach(() => {
    queue.push(1);
    queue.push(2);
    queue.push(3);
  });

  describe('when promise is resolve for the first time', () => {
    let value: number;

    beforeEach(async () => {
      value = await queue.promise;
    });

    test('should return 1', () => expect(value).toBe(1));

    describe('when promise is resolve for the second time', () => {
      let value: number;

      beforeEach(async () => {
        value = await queue.promise;
      });

      test('should return 2', () => expect(value).toBe(2));

      describe('when promise is resolve for the third time', () => {
        let value: number;

        beforeEach(async () => {
          value = await queue.promise;
        });

        test('should return 3', () => expect(value).toBe(3));
      });
    });
  });

  describe('when resolving 3 at once', () => {
    let values: number[];

    beforeEach(async () => {
      values = [];

      values.push(await queue.promise);
      values.push(await queue.promise);
      values.push(await queue.promise);
    });

    test('should return all values', () => expect(values).toEqual([1, 2, 3]));
  });
});
