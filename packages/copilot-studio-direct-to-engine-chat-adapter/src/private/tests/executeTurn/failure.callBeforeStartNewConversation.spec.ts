import { setupServer } from 'msw/node';
import DirectToEngineServerSentEventsChatAdapterAPI from '../../DirectToEngineServerSentEventsChatAdapterAPI';
import type { HalfDuplexChatAdapterAPIStrategy } from '../../types/HalfDuplexChatAdapterAPIStrategy';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('When call executeTurn before start new conversation', () => {
  let adapter: DirectToEngineServerSentEventsChatAdapterAPI;
  let executeTurnResult: ReturnType<DirectToEngineServerSentEventsChatAdapterAPI['executeTurn']>;

  beforeEach(() => {
    const strategy: HalfDuplexChatAdapterAPIStrategy = {
      async prepareExecuteTurn() {
        return Promise.resolve({ baseURL: new URL('http://test/?api=execute#2') });
      },
      async prepareStartNewConversation() {
        return Promise.resolve({ baseURL: new URL('http://test/?api=start#1') });
      }
    };

    adapter = new DirectToEngineServerSentEventsChatAdapterAPI(strategy, { retry: { factor: 1, minTimeout: 0 } });
    executeTurnResult = adapter.executeTurn({
      from: { id: 'u-00001', role: 'user' },
      text: 'Hello, World!',
      type: 'message'
    });
  });

  describe('when iterate', () => {
    let iteratePromise: Promise<unknown>;

    beforeEach(async () => {
      iteratePromise = executeTurnResult.next();

      await iteratePromise.catch(() => {});
    });

    test('should reject', () =>
      expect(iteratePromise).rejects.toThrow('startNewConversation() must be called before executeTurn().'));

    test('"conversationId" getter should return undefined', () => expect(adapter.conversationId).toBeUndefined());
  });
});
