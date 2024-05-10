import { type Activity } from 'botframework-directlinejs';

export type StartNewConversationInit = {
  emitStartConversationEvent: boolean;
  locale?: string | undefined;
};

export interface HalfDuplexChatAdapterAPI {
  startNewConversation(init: StartNewConversationInit): AsyncIterableIterator<Activity>;
  executeTurn(activity: Activity): AsyncIterableIterator<Activity>;
}
