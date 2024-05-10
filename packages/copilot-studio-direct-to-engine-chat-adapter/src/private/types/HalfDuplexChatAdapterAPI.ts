import { type Activity } from 'botframework-directlinejs';

export interface HalfDuplexChatAdapterAPI {
  startNewConversation(emitStartConversationEvent: boolean): AsyncIterableIterator<Activity>;
  executeTurn(activity: Activity): AsyncIterableIterator<Activity>;
}
