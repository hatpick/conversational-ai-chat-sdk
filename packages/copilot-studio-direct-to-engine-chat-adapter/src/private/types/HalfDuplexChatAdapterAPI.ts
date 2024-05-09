/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import { type Activity } from 'botframework-directlinejs';
import { type ConversationId } from './ConversationId';

export interface HalfDuplexChatAdapterAPI {
  get conversationId(): ConversationId | undefined;

  startNewConversation(emitStartConversationEvent: boolean): AsyncIterableIterator<Activity>;
  executeTurn(activity: Activity): AsyncIterableIterator<Activity>;
}
