import {
  TestCanvasBotAPIStrategy,
  createHalfDuplexChatAdapter,
  toDirectLineJS
} from 'copilot-studio-direct-to-engine-chat-adapter';
import { Fragment, memo, useCallback, useEffect, useMemo } from 'react';

import { type Transport } from '../types/Transport';
import ReactWebChatShim from './ReactWebChatShim';

type Props = {
  botId: string;
  deltaToken: string;
  environmentId: string;
  islandURI: string;
  token: string;
  transport: Transport;
};

export default memo(function WebChat({ botId, deltaToken, environmentId, islandURI, token, transport }: Props) {
  const getTokenCallback = useCallback<() => Promise<string>>(() => Promise.resolve(token), [token]);

  const strategy = useMemo(
    () =>
      new TestCanvasBotAPIStrategy({
        botId,
        deltaToken,
        environmentId,
        getTokenCallback,
        islandURI: new URL(islandURI),
        transport
      }),
    [botId, deltaToken, environmentId, getTokenCallback, islandURI]
  );

  const chatAdapter = useMemo(() => toDirectLineJS(createHalfDuplexChatAdapter(strategy)), [strategy]);

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
        new TestCanvasBotAPIStrategy({'{'}
        {'\n  '}botId: {`'${botId}',`}
        {'\n  '}deltaToken: {`'${deltaToken}',`}
        {'\n  '}environmentId: {`'${environmentId.toString()}',`}
        {'\n  '}getTokenCallback: () =&gt; token,
        {'\n  '}islandURI: {`new URL('${islandURI.toString()}'),`}
        {'\n  '}transport: {`'${transport}'`}
        {'\n}'})
      </pre>
      <div className="webchat">
        <ReactWebChatShim directLine={chatAdapter} />
      </div>
    </Fragment>
  );
});
