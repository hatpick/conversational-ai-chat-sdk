import {
  UUID_REGEX,
  never,
  object,
  optional,
  regex,
  special,
  string,
  union,
  value,
  type Output,
  type SpecialSchema,
  type StringSchema
} from 'valibot';

import { type Strategy } from './types/Strategy';
import { type Transport } from './types/Transport';

const TestCanvasBotStrategyInitSchema = () =>
  object(
    {
      botId: string([regex(UUID_REGEX)]),
      environmentId: string([regex(UUID_REGEX)]),
      getDeltaTokenCallback: optional(
        special(input => typeof input === 'function') as SpecialSchema<() => string | undefined>
      ),
      getTokenCallback: special(input => typeof input === 'function') as SpecialSchema<() => Promise<string>>,
      islandURI: special(input => input instanceof URL) as SpecialSchema<URL>,
      transport: union([
        string([value('rest')]) as StringSchema<'rest'>,
        string([value('server sent events')]) as StringSchema<'server sent events'>
      ])
    },
    never()
  );

type TestCanvasBotStrategyInit = Output<ReturnType<typeof TestCanvasBotStrategyInitSchema>>;

export default class TestCanvasBotStrategy implements Strategy {
  constructor({
    botId,
    islandURI,
    environmentId,
    getDeltaTokenCallback,
    getTokenCallback,
    transport
  }: TestCanvasBotStrategyInit) {
    this.#getTokenCallback = getTokenCallback;

    this.#baseURL = new URL(`/environments/${encodeURI(environmentId)}/bots/${encodeURI(botId)}/test/`, islandURI);
    this.#getDeltaTokenCallback = getDeltaTokenCallback;
    this.#transport = transport;
  }

  #baseURL: URL;
  #getDeltaTokenCallback: (() => string | undefined) | undefined;
  #getTokenCallback: () => Promise<string>;
  #transport: Transport;

  async #getHeaders() {
    return new Headers({ authorization: `Bearer ${await this.#getTokenCallback()}` });
  }

  public async prepareExecuteTurn(): ReturnType<Strategy['prepareExecuteTurn']> {
    return {
      baseURL: this.#baseURL,
      body: { deltaToken: this.#getDeltaTokenCallback?.() },
      headers: await this.#getHeaders(),
      transport: this.#transport
    };
  }

  public async prepareStartNewConversation(): ReturnType<Strategy['prepareStartNewConversation']> {
    return {
      baseURL: this.#baseURL,
      body: { deltaToken: this.#getDeltaTokenCallback?.() },
      headers: await this.#getHeaders(),
      transport: this.#transport
    };
  }
}
