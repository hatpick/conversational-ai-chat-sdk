/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import { type Transport } from '../../types/Transport';

type PartialRequestInit = {
  baseURL: URL;
  body?: Record<string, unknown> | undefined;
  headers?: Headers | undefined;
  transport?: Transport | undefined;
};

export interface HalfDuplexChatAdapterAPIStrategy {
  prepareExecuteTurn(): Promise<PartialRequestInit>;
  prepareStartNewConversation(): Promise<PartialRequestInit>;
}
