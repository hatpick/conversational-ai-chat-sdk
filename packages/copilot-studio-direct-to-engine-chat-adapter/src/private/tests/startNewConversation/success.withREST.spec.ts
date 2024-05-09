import type { Activity } from 'botframework-directlinejs';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import DirectToEngineServerSentEventsChatAdapterAPI from '../../DirectToEngineServerSentEventsChatAdapterAPI';
import type { BotResponse } from '../../types/BotResponse';
import type { HalfDuplexChatAdapterAPIStrategy } from '../../types/HalfDuplexChatAdapterAPIStrategy';
import type { DefaultHttpResponseResolver } from '../types/DefaultHttpResponseResolver';
import type { JestMockOf } from '../types/JestMockOf';
import type { ResultOfPromise } from '../types/ResultOfPromise';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const strategy: HalfDuplexChatAdapterAPIStrategy = {
  async prepareExecuteTurn() {
    return { baseURL: new URL('http://test/') };
  },
  async prepareStartNewConversation() {
    return { baseURL: new URL('http://test/') };
  }
};

describe('When conversation started and bot returned with 2 activities in 2 turns', () => {
  let postContinue: JestMockOf<DefaultHttpResponseResolver>;
  let postConversations: JestMockOf<DefaultHttpResponseResolver>;
  let startNewConversationResult: ResultOfPromise<
    ReturnType<DirectToEngineServerSentEventsChatAdapterAPI['startNewConversation']>
  >;

  beforeEach(async () => {
    postConversations = jest.fn<ReturnType<DefaultHttpResponseResolver>, Parameters<DefaultHttpResponseResolver>>(() =>
      HttpResponse.json({
        action: 'continue',
        activities: [{ conversation: { id: 'c-00001' }, text: 'Hello, World!', type: 'message' }],
        conversationId: 'c-00001'
      } as BotResponse)
    );

    server.use(http.post('http://test/conversations/', postConversations));

    postContinue = jest.fn<ReturnType<DefaultHttpResponseResolver>, Parameters<DefaultHttpResponseResolver>>(() =>
      HttpResponse.json({
        action: 'waiting',
        activities: [{ conversation: { id: 'c-00001' }, text: 'Aloha!', type: 'message' }]
      } as BotResponse)
    );

    server.use(http.post('http://test/conversations/c-00001', postContinue));

    const adapter = new DirectToEngineServerSentEventsChatAdapterAPI(strategy);

    startNewConversationResult = await adapter.startNewConversation(true);
  });

  describe('should not POST to /conversations', () => {
    test('once', () => expect(postConversations).toHaveBeenCalledTimes(0));
  });

  describe('after iterate once', () => {
    let firstResult: IteratorResult<Activity>;

    beforeEach(async () => {
      firstResult = await startNewConversationResult.next();
    });

    describe('should have POST to /conversations', () => {
      test('once', () => expect(postConversations).toHaveBeenCalledTimes(1));

      test('with header "Content-Type: application/json"', () =>
        expect(postConversations.mock.calls[0][0].request.headers.get('content-type')).toBe('application/json'));

      test('with JSON body of { emitStartConversationEvent: true }', () =>
        expect(postConversations.mock.calls[0][0].request.json()).resolves.toEqual({
          emitStartConversationEvent: true
        }));
    });

    test('should not POST to /conversations/c-00001', () => expect(postContinue).toHaveBeenCalledTimes(0));

    test('should return first activity', () =>
      expect(firstResult).toEqual({
        done: false,
        value: { conversation: { id: 'c-00001' }, text: 'Hello, World!', type: 'message' }
      }));

    test('should not POST to /conversations/c-00001', () => expect(postContinue).toHaveBeenCalledTimes(0));

    describe('after iterate twice', () => {
      let secondResult: IteratorResult<Activity>;

      beforeEach(async () => {
        secondResult = await startNewConversationResult.next();
      });

      test('should return second activity', () =>
        expect(secondResult).toEqual({
          done: false,
          value: { conversation: { id: 'c-00001' }, text: 'Aloha!', type: 'message' }
        }));

      describe('should have POST to /conversations/c-00001', () => {
        test('once', () => expect(postContinue).toHaveBeenCalledTimes(1));

        test('with header "Content-Type: application/json"', () =>
          expect(postContinue.mock.calls[0][0].request.headers.get('content-type')).toBe('application/json'));

        test('with header "x-ms-conversationid: c-00001"', () =>
          expect(postContinue.mock.calls[0][0].request.headers.get('x-ms-conversationid')).toBe('c-00001'));

        test('with JSON body of {}', () => expect(postContinue.mock.calls[0][0].request.json()).resolves.toEqual({}));
      });

      describe('after iterate the third time', () => {
        let thirdResult: IteratorResult<Activity>;

        beforeEach(async () => {
          thirdResult = await startNewConversationResult.next();
        });

        test('should complete', () => expect(thirdResult).toEqual({ done: true, value: undefined }));
      });
    });
  });
});
