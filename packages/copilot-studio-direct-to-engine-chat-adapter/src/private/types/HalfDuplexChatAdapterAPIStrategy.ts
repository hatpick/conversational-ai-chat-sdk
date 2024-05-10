  baseURL: URL;
  body?: Record<string, unknown> | undefined;
  headers?: Headers | undefined;
  transport?: Transport | undefined;
};

export interface HalfDuplexChatAdapterAPIStrategy {
  prepareExecuteTurn(): Promise<PartialRequestInit>;
  prepareStartNewConversation(): Promise<PartialRequestInit>;
}
