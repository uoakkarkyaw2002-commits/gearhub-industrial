package com.skyshopmm.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationManagerCompat;

/** "Decline" button on the call alert: stops the ring, closes the call screen and tells the server. */
public class DeclineReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        NotificationManagerCompat.from(context).cancel(PushService.CALL_ID);
        context.sendBroadcast(new Intent(PushService.ACTION_CALL_END).setPackage(context.getPackageName()));
        CallApi.decline(intent.getStringExtra("callId"), intent.getStringExtra("key"));
    }
}
