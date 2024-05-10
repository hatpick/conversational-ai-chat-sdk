import { type Transport } from './Transport';

export type StrategyRequestInit = {
  baseURL: URL;
  body?: Record<string, unknown> | undefined;
  headers?: Headers | undefined;
  transport?: Transport | undefined;
};

export type Strategy = {
  prepareExecuteTurn(): Promise<StrategyRequestInit>;
  prepareStartNewConversation(): Promise<StrategyRequestInit>;
};
