import { type Activity } from 'botframework-directlinejs';

import DirectToEngineServerSentEventsChatAdapterAPI from './private/DirectToEngineServerSentEventsChatAdapterAPI';
import { type HalfDuplexChatAdapterAPI } from './private/types/HalfDuplexChatAdapterAPI';
import { type HalfDuplexChatAdapterAPIStrategy } from './private/types/HalfDuplexChatAdapterAPIStrategy';

export type ExecuteTurnFunction = (activity: Activity) => Promise<TurnGenerator>;

export type CreateExecuteTurnInit = {
  emitStartConversationEvent?: boolean;
  retry?:
    | Readonly<{
        factor?: number | undefined;
        minTimeout?: number | undefined;
        maxTimeout?: number | undefined;
        randomize?: boolean | undefined;
        retries?: number | undefined;
      }>
    | undefined;
  telemetry?: { trackException(exception: unknown, customProperties?: Record<string, unknown>): void };
};

export type TurnGenerator = AsyncGenerator<Activity, ExecuteTurnFunction, undefined>;

const createExecuteTurn = (api: HalfDuplexChatAdapterAPI): ExecuteTurnFunction => {
  let obsoleted = false;

  return async (activity: Activity): Promise<TurnGenerator> => {
    if (obsoleted) {
      throw new Error('This executeTurn() function is obsoleted. Please use a new one.');
    }

    obsoleted = true;

    const activities = await api.executeTurn(activity);

    return (async function* () {
      yield* activities;

      return createExecuteTurn(api);
    })();
  };
};

export default function createHalfDuplexChatAdapter(
  strategy: HalfDuplexChatAdapterAPIStrategy,
  init: CreateExecuteTurnInit = {}
) {
  return async (): Promise<TurnGenerator> => {
    const api = new DirectToEngineServerSentEventsChatAdapterAPI(strategy, {
      retry: init.retry,
      telemetry: init.telemetry
    });

    const activities = await api.startNewConversation(init?.emitStartConversationEvent ?? true);

    return (async function* (): TurnGenerator {
      yield* activities;

      return createExecuteTurn(api);
    })();
  };
}
