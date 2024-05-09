import type { Activity } from 'botframework-directlinejs';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import DirectToEngineServerSentEventsChatAdapterAPI from '../DirectToEngineServerSentEventsChatAdapterAPI';
import type { BotResponse } from '../types/BotResponse';
import type { HalfDuplexChatAdapterAPIStrategy } from '../types/HalfDuplexChatAdapterAPIStrategy';
import type { DefaultHttpResponseResolver } from './types/DefaultHttpResponseResolver';
import type { JestMockOf } from './types/JestMockOf';

const server = setupServer();

const NOT_MOCKED: DefaultHttpResponseResolver = () => {
  throw new Error('This function is not mocked.');
};

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe.each(['rest' as const, 'server sent events' as const])('With %s', transport => {
  let strategy: HalfDuplexChatAdapterAPIStrategy;

  beforeEach(() => {
    strategy = {
      async prepareExecuteTurn() {
        return Promise.resolve({
          baseURL: new URL('http://test/?api=execute#2'),
          body: { dummy: 'dummy' },
          headers: new Headers({ 'x-dummy': 'dummy' }),
          transport
        });
      },
      async prepareStartNewConversation() {
        return Promise.resolve({
          baseURL: new URL('http://test/?api=start#1'),
          body: { dummy: 'dummy' },
          headers: new Headers({ 'x-dummy': 'dummy' }),
          transport
        });
      }
    };
  });

  describe.each([true, false])('With emitStartConversationEvent of %s', emitStartConversationEvent => {
    let adapter: DirectToEngineServerSentEventsChatAdapterAPI;
    let httpPostContinue: JestMockOf<DefaultHttpResponseResolver>;
    let httpPostConversation: JestMockOf<DefaultHttpResponseResolver>;
    let httpPostExecute: JestMockOf<DefaultHttpResponseResolver>;

    beforeEach(() => {
      httpPostContinue = jest.fn(NOT_MOCKED);
      httpPostConversation = jest.fn(NOT_MOCKED);
      httpPostExecute = jest.fn(NOT_MOCKED);

      server.use(http.post('http://test/conversations', httpPostConversation));
      server.use(http.post('http://test/conversations/c-00001', httpPostExecute));
      server.use(http.post('http://test/conversations/c-00001/continue', httpPostContinue));

      adapter = new DirectToEngineServerSentEventsChatAdapterAPI(strategy);
    });

    describe('When conversation started and bot returned with 2 activities in 2 turns', () => {
      let startNewConversationResult: ReturnType<DirectToEngineServerSentEventsChatAdapterAPI['startNewConversation']>;

      beforeEach(() => {
        if (transport === 'rest') {
          httpPostConversation.mockImplementationOnce(() =>
            HttpResponse.json({
              action: 'continue',
              activities: [{ conversation: { id: 'c-00001' }, text: 'Hello, World!', type: 'message' }],
              conversationId: 'c-00001'
            } as BotResponse)
          );
        } else {
          httpPostConversation.mockImplementationOnce(
            () =>
              new HttpResponse(
                Buffer.from(`event: activity
data: { "conversation": { "id": "c-00001" }, "text": "Hello, World!", "type": "message" }

event: activity
data: { "conversation": { "id": "c-00001" }, "text": "Aloha!", "type": "message" }

event: end
data: end

`),
                { headers: { 'content-type': 'text/event-stream' } }
              )
          );
        }

        startNewConversationResult = adapter.startNewConversation(emitStartConversationEvent);
      });

      test('should not POST to /conversations', () => expect(httpPostConversation).toHaveBeenCalledTimes(0));

      test('"conversationId" getter should return undefined', () => expect(adapter.conversationId).toBeUndefined());

      describe('after iterate once', () => {
        let iteratorResult: IteratorResult<Activity>;

        beforeEach(async () => {
          iteratorResult = await startNewConversationResult.next();
        });

        describe('should have POST to /conversations', () => {
          test('once', () => expect(httpPostConversation).toHaveBeenCalledTimes(1));

          test('with query "api" of "start"', () =>
            expect(new URL(httpPostConversation.mock.calls[0][0].request.url)).toHaveProperty('search', '?api=start'));

          test('with hash of "#1"', () =>
            expect(new URL(httpPostConversation.mock.calls[0][0].request.url)).toHaveProperty('hash', '#1'));

          if (transport === 'server sent events') {
            test('with header "Accept" of "text/event-stream"', () =>
              expect(httpPostConversation.mock.calls[0][0].request.headers.get('accept')).toBe('text/event-stream'));
          }

          test('with header "Content-Type" of "application/json"', () =>
            expect(httpPostConversation.mock.calls[0][0].request.headers.get('content-type')).toBe('application/json'));

          test('with header "x-dummy" of "dummy"', () =>
            expect(httpPostConversation.mock.calls[0][0].request.headers.get('x-dummy')).toBe('dummy'));

          test('without header "x-ms-conversationid"', () =>
            expect(httpPostConversation.mock.calls[0][0].request.headers.has('x-ms-conversationid')).toBe(false));

          test(`with JSON body of { dummy: "dummy", emitStartConversationEvent: ${emitStartConversationEvent} }`, () =>
            expect(httpPostConversation.mock.calls[0][0].request.json()).resolves.toEqual({
              dummy: 'dummy',
              emitStartConversationEvent
            }));
        });

        test('should return the first activity', () =>
          expect(iteratorResult).toEqual({
            done: false,
            value: { conversation: { id: 'c-00001' }, text: 'Hello, World!', type: 'message' }
          }));

        test('"conversationId" getter should return "c-00001"', () => expect(adapter.conversationId).toBe('c-00001'));

        describe('after iterate twice', () => {
          let iteratorResult: IteratorResult<Activity>;

          beforeEach(async () => {
            if (transport === 'rest') {
              httpPostContinue.mockImplementationOnce(() =>
                HttpResponse.json({
                  action: 'waiting',
                  activities: [{ conversation: { id: 'c-00001' }, text: 'Aloha!', type: 'message' }]
                } as BotResponse)
              );
            }

            iteratorResult = await startNewConversationResult.next();
          });

          if (transport === 'rest') {
            describe('should have POST to /conversations/c-00001/continue', () => {
              test('once', () => expect(httpPostContinue).toHaveBeenCalledTimes(1));

              test('with query "api" of "start"', () =>
                expect(new URL(httpPostContinue.mock.calls[0][0].request.url)).toHaveProperty('search', '?api=start'));

              test('with hash of "#1"', () =>
                expect(new URL(httpPostContinue.mock.calls[0][0].request.url)).toHaveProperty('hash', '#1'));

              test('with header "Content-Type" of "application/json"', () =>
                expect(httpPostContinue.mock.calls[0][0].request.headers.get('content-type')).toBe('application/json'));

              test('with header "x-dummy" of "dummy"', () =>
                expect(httpPostConversation.mock.calls[0][0].request.headers.get('x-dummy')).toBe('dummy'));

              test('with header "x-ms-conversationid" of "c-00001"', () =>
                expect(httpPostContinue.mock.calls[0][0].request.headers.get('x-ms-conversationid')).toBe('c-00001'));

              test('with JSON body of { dummy: "dummy" }', () =>
                expect(httpPostContinue.mock.calls[0][0].request.json()).resolves.toEqual({
                  dummy: 'dummy'
                }));
            });
          }

          test('should return the second activity', () =>
            expect(iteratorResult).toEqual({
              done: false,
              value: { conversation: { id: 'c-00001' }, text: 'Aloha!', type: 'message' }
            }));

          describe('after iterate the third time', () => {
            let iteratorResult: IteratorResult<Activity>;

            beforeEach(async () => {
              iteratorResult = await startNewConversationResult.next();
            });

            test('should complete', () => expect(iteratorResult).toEqual({ done: true, value: undefined }));

            describe('when execute turn and bot returned 2 activities in 2 turns', () => {
              let executeTurnResult: ReturnType<DirectToEngineServerSentEventsChatAdapterAPI['executeTurn']>;

              beforeEach(() => {
                if (transport === 'rest') {
                  httpPostExecute.mockImplementationOnce(() =>
                    HttpResponse.json({
                      action: 'continue',
                      activities: [{ conversation: { id: 'c-00001' }, text: 'Good morning!', type: 'message' }]
                    } as BotResponse)
                  );
                } else if (transport === 'server sent events') {
                  httpPostExecute.mockImplementationOnce(
                    () =>
                      new HttpResponse(
                        Buffer.from(`event: activity
data: { "conversation": { "id": "c-00001" }, "text": "Good morning!", "type": "message" }

event: activity
data: { "conversation": { "id": "c-00001" }, "text": "Goodbye!", "type": "message" }

event: end
data: end

`),
                        { headers: { 'content-type': 'text/event-stream' } }
                      )
                  );
                }

                executeTurnResult = adapter.executeTurn({
                  from: { id: 'u-00001', role: 'user' },
                  text: 'Morning.',
                  type: 'message'
                });
              });

              test('should not POST to /conversations/c-00001', () => expect(httpPostExecute).toHaveBeenCalledTimes(0));

              describe('after iterate once', () => {
                let iteratorResult: IteratorResult<Activity>;

                beforeEach(async () => {
                  iteratorResult = await executeTurnResult.next();
                });

                describe('should have POST to /conversations/c-00001', () => {
                  test('once', () => expect(httpPostExecute).toHaveBeenCalledTimes(1));

                  test('with query "api" of "execute"', () =>
                    expect(new URL(httpPostExecute.mock.calls[0][0].request.url)).toHaveProperty(
                      'search',
                      '?api=execute'
                    ));

                  test('with hash of "#2"', () =>
                    expect(new URL(httpPostExecute.mock.calls[0][0].request.url)).toHaveProperty('hash', '#2'));

                  if (transport === 'server sent events') {
                    test('with header "Accept" of "text/event-stream"', () =>
                      expect(httpPostExecute.mock.calls[0][0].request.headers.get('accept')).toBe('text/event-stream'));
                  }

                  test('with header "Content-Type" of "application/json"', () =>
                    expect(httpPostExecute.mock.calls[0][0].request.headers.get('content-type')).toBe(
                      'application/json'
                    ));

                  test('with header "x-dummy" of "dummy"', () =>
                    expect(httpPostConversation.mock.calls[0][0].request.headers.get('x-dummy')).toBe('dummy'));

                  test('with header "x-ms-conversationid" of "c-00001"', () =>
                    expect(httpPostExecute.mock.calls[0][0].request.headers.get('x-ms-conversationid')).toBe(
                      'c-00001'
                    ));

                  test('with JSON body of activity and { dummy: "dummy" }', () =>
                    expect(httpPostExecute.mock.calls[0][0].request.json()).resolves.toEqual({
                      activity: {
                        from: { id: 'u-00001', role: 'user' },
                        text: 'Morning.',
                        type: 'message'
                      },
                      dummy: 'dummy'
                    }));
                });

                test('should return the third activity', () =>
                  expect(iteratorResult).toEqual({
                    done: false,
                    value: { conversation: { id: 'c-00001' }, text: 'Good morning!', type: 'message' }
                  }));

                describe('after iterate twice', () => {
                  let iteratorResult: IteratorResult<Activity>;

                  beforeEach(async () => {
                    if (transport === 'rest') {
                      httpPostContinue.mockImplementationOnce(() =>
                        HttpResponse.json({
                          action: 'waiting',
                          activities: [{ conversation: { id: 'c-00001' }, text: 'Goodbye!', type: 'message' }]
                        } as BotResponse)
                      );
                    }

                    iteratorResult = await executeTurnResult.next();
                  });

                  if (transport === 'rest') {
                    describe('should have POST to /conversations/c-00001/continue', () => {
                      test('twice', () => expect(httpPostContinue).toHaveBeenCalledTimes(2));

                      test('with query "api" of "execute"', () =>
                        expect(new URL(httpPostContinue.mock.calls[1][0].request.url)).toHaveProperty(
                          'search',
                          '?api=execute'
                        ));

                      test('with hash of "#2"', () =>
                        expect(new URL(httpPostContinue.mock.calls[1][0].request.url)).toHaveProperty('hash', '#2'));

                      test('with header "Content-Type" of "application/json"', () =>
                        expect(httpPostContinue.mock.calls[1][0].request.headers.get('content-type')).toBe(
                          'application/json'
                        ));

                      test('with header "x-dummy" of "dummy"', () =>
                        expect(httpPostContinue.mock.calls[1][0].request.headers.get('x-dummy')).toBe('dummy'));

                      test('with header "x-ms-conversationid" of "c-00001"', () =>
                        expect(httpPostContinue.mock.calls[1][0].request.headers.get('x-ms-conversationid')).toBe(
                          'c-00001'
                        ));

                      test('with JSON body of { dummy: "dummy" }', () =>
                        expect(httpPostContinue.mock.calls[1][0].request.json()).resolves.toEqual({
                          dummy: 'dummy'
                        }));
                    });
                  }

                  test('should return the fourth activity', () =>
                    expect(iteratorResult).toEqual({
                      done: false,
                      value: { conversation: { id: 'c-00001' }, text: 'Goodbye!', type: 'message' }
                    }));

                  describe('after iterate the third time', () => {
                    let iteratorResult: IteratorResult<Activity>;

                    beforeEach(async () => {
                      iteratorResult = await executeTurnResult.next();
                    });

                    test('should complete', () => expect(iteratorResult).toEqual({ done: true, value: undefined }));
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
