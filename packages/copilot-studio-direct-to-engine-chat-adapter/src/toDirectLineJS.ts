import { type Activity } from 'botframework-directlinejs';
import {
  DeferredObservable,
  DeferredPromise,
  Observable,
  shareObservable
} from 'powerva-turn-based-chat-adapter-framework';
import { v4 } from 'uuid';

import type { ExecuteTurnFunction, TurnGenerator } from './createHalfDuplexChatAdapter';
import iterateWithReturnValue from './private/iterateWithReturnValue';
import { type ActivityId, type DirectLineJSBotConnection } from './types/DirectLineJSBotConnection';

export default function toDirectLineJS(halfDuplexChatAdapter: TurnGenerator): DirectLineJSBotConnection {
  let nextSequenceId = 0;
  let postActivityDeferred = new DeferredPromise<readonly [Activity, (id: ActivityId) => void]>();

  // TODO: Find out why replyToId is pointing to nowhere.
  // TODO: Can the service add "timestamp" field?
  // TODO: Can the service echo back the activity?
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const patchActivity = ({ replyToId: _, ...activity }: Activity & { replyToId?: string }): Activity => ({
    ...activity,
    channelData: { ...activity.channelData, 'webchat:sequence-id': nextSequenceId++ },
    timestamp: new Date().toISOString()
  });

  const activityDeferredObservable = new DeferredObservable<Activity>(observer => {
    (async function () {
      connectionStatusDeferredObservable.next(0);
      connectionStatusDeferredObservable.next(1);

      let activities: AsyncIterable<Activity>;
      let turnGenerator: TurnGenerator = halfDuplexChatAdapter;
      let handleIncomingActivityOnce: (() => void) | undefined = () => connectionStatusDeferredObservable.next(2);

      // await new Promise(resolve => setTimeout(resolve, 1_000));

      try {
        for (;;) {
          let getExecuteTurn: () => ExecuteTurnFunction;

          [activities, getExecuteTurn] = iterateWithReturnValue(turnGenerator);

          for await (const activity of activities) {
            handleIncomingActivityOnce?.();
            handleIncomingActivityOnce = undefined;

            await 0; // HACK: Web Chat need a spare cycle between connectionStatus$ change and activity$ subscription.

            observer.next(patchActivity(activity));
          }

          const executeTurn = getExecuteTurn();
          const [activity, callback] = await postActivityDeferred.promise;

          postActivityDeferred = new DeferredPromise();

          turnGenerator = executeTurn(activity);

          // We will generate the activity ID and echoback the activity only when the first incoming activity arrived.
          // This make sure the bot acknowledged the outgoing activity before we echoback the activity.
          handleIncomingActivityOnce = () => {
            const activityId = v4() as ActivityId;

            observer.next(patchActivity({ ...activity, id: activityId }));
            callback(activityId);
          };
        }
      } catch (error) {
        console.error('Failed to communicate with the chat adapter.', error);

        connectionStatusDeferredObservable.next(4);
      }
    })();
  });

  const connectionStatusDeferredObservable = new DeferredObservable<number>();

  return {
    activity$: shareObservable(activityDeferredObservable.observable),
    connectionStatus$: shareObservable(connectionStatusDeferredObservable.observable),
    end() {
      // Half-duplex connection does not requires implicit closing.
    },
    postActivity: (activity: Activity) =>
      shareObservable(
        new Observable<ActivityId>(observer =>
          postActivityDeferred.resolve(Object.freeze([activity, id => observer.next(id)]))
        )
      )
  };
}
