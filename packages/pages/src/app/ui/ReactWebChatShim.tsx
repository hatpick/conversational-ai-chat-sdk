import type ReactWebChat from 'botframework-webchat';
import React, { useEffect, useRef, type ComponentType } from 'react';

type PropsOf<T> = T extends ComponentType<infer P> ? P : never;
type Props = PropsOf<typeof ReactWebChat>;

let loadWebChatJSPromise: Promise<void> | undefined;

async function loadWebChatJS(): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptElement = document.createElement('script');

    scriptElement.setAttribute('async', 'async');
    scriptElement.setAttribute('src', 'asset/js/webchat-es5.js');

    scriptElement.addEventListener('load', () => resolve(), { once: true });
    scriptElement.addEventListener('error', reject, { once: true });

    window.React = React;

    document.body.appendChild(scriptElement);
  });
}

const ReactWebChatShim = (props: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const abortController = new AbortController();

    (async function () {
      if (!('WebChat' in window)) {
        await (loadWebChatJSPromise || (loadWebChatJSPromise = loadWebChatJS()));
      }

      if (abortController.signal.aborted) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)['WebChat'].renderWebChat(props, ref.current);
    })();

    return () => abortController.abort();
  }, [props]);

  return <div ref={ref} style={{ display: 'contents' }} />;
};

export default ReactWebChatShim;
