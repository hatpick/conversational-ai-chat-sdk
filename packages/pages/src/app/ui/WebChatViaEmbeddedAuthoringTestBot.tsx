import {
  EmbeddedAuthoringBotStrategy,
  createHalfDuplexChatAdapter,
  toDirectLineJS
} from 'copilot-studio-direct-to-engine-chat-adapter';
import { Fragment, memo, useCallback, useEffect, useMemo } from 'react';
import { useRefFrom } from 'use-ref-from';

import onErrorResumeNext from '../util/onErrorResumeNext';
import ReactWebChatShim from './ReactWebChatShim';

type Props = {
  baseURL: string;
  botSchema: string;
  deltaToken: string;
  emitStartConversationEvent: boolean;
  token: string;
};

export default memo(function WebChat({ baseURL, botSchema, deltaToken, emitStartConversationEvent, token }: Props) {
  const deltaTokenRef = useRefFrom(deltaToken);
  const tokenRef = useRefFrom(token);
  const getDeltaToken = useCallback<() => Promise<string | undefined>>(
    () => Promise.resolve(deltaTokenRef.current),
    [deltaTokenRef]
  );
  const getToken = useCallback<() => Promise<string>>(() => Promise.resolve(tokenRef.current), [tokenRef]);

  const strategy = useMemo(
    () =>
      new EmbeddedAuthoringBotStrategy({
        baseURL: onErrorResumeNext(() => new URL(baseURL)) || new URL('https://wrong-base-url.localhost/'),
        botSchema,
        getDeltaToken,
        getToken
      }),
    [baseURL, botSchema, getDeltaToken, getToken]
  );

  const chatAdapter = useMemo(
    () => toDirectLineJS(createHalfDuplexChatAdapter(strategy, { emitStartConversationEvent })),
    [emitStartConversationEvent, strategy]
  );

  useEffect(
    () => () => {
      try {
        chatAdapter?.end();
      } catch {
        // Intentionally left blank.
      }
    },
    [chatAdapter]
  );

  return (
    <Fragment>
      <h2>Chat adapter strategy parameters</h2>
      <pre>
        {'new EmbeddedAuthoringBotStrategy({'}
        {`\n  baseURL: '${baseURL}',`}
        {`\n  botSchema: '${botSchema}',`}
        {`\n  getDeltaToken: () => '${deltaToken.slice(0, 5)}…',`}
        {`\n  getToken: () => '${token.slice(0, 5)}…'`}
        {`\n})`}
      </pre>
      <div className="webchat">
        <ReactWebChatShim directLine={chatAdapter} />
      </div>
    </Fragment>
  );
});
