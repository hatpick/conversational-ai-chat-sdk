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

      let isConnected = false;
      let activities: AsyncIterable<Activity>;
      let turnGenerator: TurnGenerator = halfDuplexChatAdapter;

      for (;;) {
        let getExecuteTurn: () => ExecuteTurnFunction;

        [activities, getExecuteTurn] = iterateWithReturnValue(turnGenerator);

        for await (const activity of activities) {
          if (!isConnected) {
            isConnected = true;
            connectionStatusDeferredObservable.next(2);
          }

          observer.next(patchActivity(activity));
        }

        const executeTurn = getExecuteTurn();
        const [activity, callback] = await postActivityDeferred.promise;

        postActivityDeferred = new DeferredPromise();

        const activityId = v4() as ActivityId;

        turnGenerator = executeTurn(activity);

        // We assume calling executeTurn() will always send the message successfully.
        // Better, the bot should always send us a "typing" activity before sending us any "message" activity.
        observer.next(patchActivity({ ...activity, id: activityId }));
        callback(activityId);
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
