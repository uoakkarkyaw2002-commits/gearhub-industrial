package com.skyshopmm.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.core.app.NotificationManagerCompat;

/** Full-screen incoming call, over the lock screen: ringtone + vibration, Answer opens the call in the app. */
public class CallActivity extends Activity {
    static volatile boolean showing = false;
    private Ringtone ringtone;
    private Vibrator vibrator;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final BroadcastReceiver ended = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { finishCall(); }
    };

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        showing = true;
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        setContentView(R.layout.activity_call);
        final String name = getIntent().getStringExtra("name") == null ? "SkyShopMM" : getIntent().getStringExtra("name");
        final String url = getIntent().getStringExtra("url") == null ? "/" : getIntent().getStringExtra("url");
        boolean video = getIntent().getBooleanExtra("video", false);
        ((TextView) findViewById(R.id.caller)).setText(name.replaceAll("^[^\\p{L}\\p{N}]+", ""));
        String initial = name.replaceAll("^[^\\p{L}\\p{N}]+", "");
        ((TextView) findViewById(R.id.avatar)).setText(initial.isEmpty() ? "S" : initial.substring(0, 1).toUpperCase());
        ((TextView) findViewById(R.id.status)).setText(video ? R.string.incoming_video_call : R.string.incoming_call);
        findViewById(R.id.answer).setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                final Intent i = new Intent(CallActivity.this, MainActivity.class).putExtra(MainActivity.EXTRA_URL, url + (url.contains("?") ? "&" : "?") + "call=accept")
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                try { if (ringtone != null) ringtone.stop(); if (vibrator != null) vibrator.cancel(); } catch (Throwable ignored) { }
                KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                if (km != null && km.isKeyguardLocked() && Build.VERSION.SDK_INT >= 26) {
                    // Locked phone: ask Android to unlock first (fingerprint / PIN), then open the call. Without this the app opens behind the lock screen.
                    km.requestDismissKeyguard(CallActivity.this, new KeyguardManager.KeyguardDismissCallback() {
                        @Override public void onDismissSucceeded() { startActivity(i); finishCall(); }
                        @Override public void onDismissCancelled() { }
                        @Override public void onDismissError() { startActivity(i); finishCall(); }
                    });
                } else {
                    startActivity(i);
                    finishCall();
                }
            }
        });
        findViewById(R.id.decline).setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { CallApi.decline(getIntent().getStringExtra("callId"), getIntent().getStringExtra("key")); finishCall(); }
        });
        if (getIntent().getBooleanExtra("selfRing", false)) ring();
        IntentFilter f = new IntentFilter(PushService.ACTION_CALL_END);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(ended, f, Context.RECEIVER_NOT_EXPORTED); else registerReceiver(ended, f);
        handler.postDelayed(new Runnable() { @Override public void run() { finishCall(); } }, 45000);
    }

    private void ring() {
        try {
            ringtone = RingtoneManager.getRingtone(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE));
            if (Build.VERSION.SDK_INT >= 28) ringtone.setLooping(true);
            ringtone.play();
        } catch (Throwable ignored) { }
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            long[] pattern = {0, 800, 400, 800, 400};
            if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0)); else vibrator.vibrate(pattern, 0);
        } catch (Throwable ignored) { }
    }

    private void finishCall() {
        try { if (ringtone != null) ringtone.stop(); } catch (Throwable ignored) { }
        try { if (vibrator != null) vibrator.cancel(); } catch (Throwable ignored) { }
        NotificationManagerCompat.from(this).cancel(PushService.CALL_ID);
        finish();
    }

    @Override protected void onDestroy() {
        showing = false;
        handler.removeCallbacksAndMessages(null);
        try { unregisterReceiver(ended); } catch (Throwable ignored) { }
        try { if (ringtone != null) ringtone.stop(); } catch (Throwable ignored) { }
        try { if (vibrator != null) vibrator.cancel(); } catch (Throwable ignored) { }
        super.onDestroy();
    }
}
