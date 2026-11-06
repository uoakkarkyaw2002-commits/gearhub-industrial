package com.skyshopmm.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

public class App extends Application {
    static final String CHANNEL_MESSAGES = "messages";
    static final String CHANNEL_CALLS = "calls";
    static final String CHANNEL_CALLS_QUIET = "calls_quiet";
    // True from process start until the first MainActivity launch: the app was just opened (not resumed, not answered from a call or a notification).
    static boolean cold = true;

    @Override public void onCreate() {
        super.onCreate();
        createChannels(this);
    }

    static void createChannels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        NotificationChannel messages = new NotificationChannel(CHANNEL_MESSAGES, c.getString(R.string.channel_messages), NotificationManager.IMPORTANCE_HIGH);
        messages.enableVibration(true);
        nm.createNotificationChannel(messages);
        // The call channel rings: ringtone sound, strong vibration, shown over the lock screen.
        NotificationChannel calls = new NotificationChannel(CHANNEL_CALLS, c.getString(R.string.channel_calls), NotificationManager.IMPORTANCE_HIGH);
        Uri ring = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        calls.setSound(ring, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        calls.enableVibration(true);
        calls.setVibrationPattern(new long[]{0, 800, 400, 800, 400, 800, 400, 800});
        calls.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(calls);
        // Used when the app is already open: the call screen itself rings, this entry only sits quietly in the shade (no banner, no sound).
        NotificationChannel quiet = new NotificationChannel(CHANNEL_CALLS_QUIET, c.getString(R.string.channel_calls) + " (app open)", NotificationManager.IMPORTANCE_LOW);
        quiet.setSound(null, null);
        quiet.enableVibration(false);
        nm.createNotificationChannel(quiet);
    }
}
