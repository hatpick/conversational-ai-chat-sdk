import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import DirectToEngineServerSentEventsChatAdapterAPI from '../../DirectToEngineServerSentEventsChatAdapterAPI';
import type { HalfDuplexChatAdapterAPIStrategy } from '../../types/HalfDuplexChatAdapterAPIStrategy';
import type { DefaultHttpResponseResolver } from '../types/DefaultHttpResponseResolver';
import type { JestMockOf } from '../types/JestMockOf';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe.each([['rest' as const], ['server sent events' as const]])('Using %s', transport => {
  describe.each([
    ['server closed connection', HttpResponse.error(), { numCalled: 5 }],
    ['server returned 400', new HttpResponse(undefined, { status: 400 }), { numCalled: 1 }],
    ['server returned 500', new HttpResponse(undefined, { status: 500 }), { numCalled: 5 }]
  ])('when conversation started and %s', (_, response, { numCalled }) => {
    let postConversations: JestMockOf<DefaultHttpResponseResolver>;
    let startNewConversationResult: ReturnType<DirectToEngineServerSentEventsChatAdapterAPI['startNewConversation']>;

    beforeEach(() => {
      postConversations = jest.fn<ReturnType<DefaultHttpResponseResolver>, Parameters<DefaultHttpResponseResolver>>(
        () => response
      );

      server.use(http.post('http://test/conversations/', postConversations));

      const strategy: HalfDuplexChatAdapterAPIStrategy = {
        async prepareExecuteTurn() {
          return Promise.resolve({ baseURL: new URL('http://test/'), transport });
        },
        async prepareStartNewConversation() {
          return Promise.resolve({ baseURL: new URL('http://test/'), transport });
        }
      };

      const adapter = new DirectToEngineServerSentEventsChatAdapterAPI(strategy, {
        retry: { factor: 1, minTimeout: 0 }
      });

      startNewConversationResult = adapter.startNewConversation(true);
    });

    describe('when iterate', () => {
      let iteratePromise: Promise<unknown>;

      beforeEach(async () => {
        iteratePromise = startNewConversationResult.next();

        await iteratePromise.catch(() => {});
      });

      describe('should have POST to /conversations', () => {
        test(numCalled === 1 ? 'once' : `${numCalled} times`, () =>
          expect(postConversations).toHaveBeenCalledTimes(numCalled)
        );

        test('with header "Content-Type" of "application/json"', () =>
          expect(postConversations.mock.calls[0][0].request.headers.get('content-type')).toBe('application/json'));

        test('without header "x-ms-conversationid"', () =>
          expect(postConversations.mock.calls[0][0].request.headers.has('x-ms-conversationid')).toBe(false));

        test('with JSON body of { emitStartConversationEvent: true }', () =>
          expect(postConversations.mock.calls[0][0].request.json()).resolves.toEqual({
            emitStartConversationEvent: true
          }));
      });

      test('should reject', () => expect(iteratePromise).rejects.toThrow());
    });
  });
});
