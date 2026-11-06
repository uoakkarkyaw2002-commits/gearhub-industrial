package com.skyshopmm.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.media.RingtoneManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/** Receives the server's data messages: chat/order alerts, and calls (full-screen ring) until the call ends. */
public class PushService extends FirebaseMessagingService {
    static final int CALL_ID = 1001;
    static final String ACTION_CALL_END = "com.skyshopmm.app.CALL_END";

    @Override public void onNewToken(String token) {
        getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE).edit().putString(MainActivity.KEY_TOKEN, token).apply();
    }

    @Override public void onMessageReceived(RemoteMessage message) {
        Map<String, String> d = message.getData();
        String kind = d.get("kind") == null ? "chat" : d.get("kind");
        App.createChannels(this);
        if ("call-end".equals(kind)) {
            NotificationManagerCompat.from(this).cancel(CALL_ID);
            sendBroadcast(new Intent(ACTION_CALL_END).setPackage(getPackageName()));
            return;
        }
        String title = d.get("title") == null ? "SkyShopMM" : d.get("title");
        String body = d.get("body") == null ? "" : d.get("body");
        String url = d.get("url") == null ? "/" : d.get("url");
        if ("call".equals(kind)) { showCall(title, body, url, "1".equals(d.get("video")), d.get("callId"), d.get("key"), "1".equals(d.get("fg"))); return; }
        showMessage(title, body, url, kind);
    }

    private PendingIntent open(String url, int req) {
        Intent i = new Intent(this, MainActivity.class).putExtra(MainActivity.EXTRA_URL, url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        return PendingIntent.getActivity(this, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void showMessage(String title, String body, String url, String kind) {
        int id = (kind + title + body).hashCode();
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, App.CHANNEL_MESSAGES)
                .setSmallIcon(R.drawable.ic_notification).setContentTitle(title).setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH).setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true).setContentIntent(open(url, id));
        try { NotificationManagerCompat.from(this).notify(id, b.build()); } catch (SecurityException ignored) { }
    }

    private void showCall(String title, String body, String url, boolean video, String callId, String key, boolean appOpen) {
        Intent full = new Intent(this, CallActivity.class)
                .putExtra("name", title).putExtra("url", url).putExtra("video", video).putExtra("callId", callId).putExtra("key", key).putExtra("selfRing", appOpen).putExtra("selfRing", appOpen)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent fullPi = PendingIntent.getActivity(this, CALL_ID, full, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, appOpen ? App.CHANNEL_CALLS_QUIET : App.CHANNEL_CALLS)
                .setSmallIcon(R.drawable.ic_notification).setContentTitle(title).setContentText(body)
                .setPriority(appOpen ? NotificationCompat.PRIORITY_LOW : NotificationCompat.PRIORITY_MAX).setCategory(NotificationCompat.CATEGORY_CALL)
                .setOngoing(true).setAutoCancel(false).setTimeoutAfter(45000)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(open(url, CALL_ID));
        if (!appOpen) b.setFullScreenIntent(fullPi, true);
        // When the phone is in use, Android shows the alert as a banner instead of the full screen: give it real Answer / Decline buttons.
        Intent decline = new Intent(this, DeclineReceiver.class).putExtra("callId", callId).putExtra("key", key);
        b.addAction(0, getString(R.string.answer), open(url + (url.contains("?") ? "&" : "?") + "call=accept", CALL_ID + 1));
        b.addAction(0, getString(R.string.decline), PendingIntent.getBroadcast(this, CALL_ID + 2, decline, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        // The ring is the notification's own sound, repeated until the call is answered/ended (FLAG_INSISTENT); the full-screen
        // call screen itself stays silent, so there is exactly one ringtone.
        android.app.Notification n = b.build();
        if (!appOpen) n.flags |= android.app.Notification.FLAG_INSISTENT;
        try { NotificationManagerCompat.from(this).notify(CALL_ID, n); } catch (SecurityException ignored) { }
        // When the phone is awake and unlocked the system shows the heads-up above; also start the screen ourselves if allowed.
        try { startActivity(full); } catch (Throwable ignored) { }
    }
}
