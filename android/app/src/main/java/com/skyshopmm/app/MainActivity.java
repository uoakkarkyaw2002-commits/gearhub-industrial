package com.skyshopmm.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.androidbrowserhelper.trusted.LauncherActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

/**
 * Opens skyshopmm.com in Chrome as a Trusted Web Activity. Before that it (1) asks for the notification permission the
 * way every Android app does, and (2) gets the phone's Firebase address and hands it to the page in the start URL
 * (?fcm=...), so the page can save it on the person's account and the server can ring this phone.
 */
public class MainActivity extends LauncherActivity {
    static final String HOST = "skyshopmm.com";
    static final String PREFS = "skyshopmm";
    static final String KEY_TOKEN = "fcm";
    static final String EXTRA_URL = "url";
    private static final int REQ_NOTIFY = 77;
    private boolean launched = false;

    @Override protected boolean shouldLaunchImmediately() { return false; }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFY);
        } else {
            fetchTokenThenLaunch();
        }
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        fetchTokenThenLaunch();
    }

    private void fetchTokenThenLaunch() {
        // Already know this phone's Firebase address: open at once (an answered call must not wait), refresh it in the background.
        final boolean known = getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TOKEN, null) != null;
        if (known) {
            try {
                if (!FirebaseApp.getApps(this).isEmpty()) FirebaseMessaging.getInstance().getToken().addOnCompleteListener(new OnCompleteListener<String>() {
                    @Override public void onComplete(Task<String> task) {
                        if (task.isSuccessful() && task.getResult() != null) getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_TOKEN, task.getResult()).apply();
                    }
                });
            } catch (Throwable ignored) { }
            launchOnce();
            return;
        }
        final Handler h = new Handler(Looper.getMainLooper());
        final Runnable go = new Runnable() { @Override public void run() { launchOnce(); } };
        h.postDelayed(go, 3500);   // never keep the person waiting for Firebase
        try {
            if (FirebaseApp.getApps(this).isEmpty()) { h.removeCallbacks(go); launchOnce(); return; }
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(new OnCompleteListener<String>() {
                @Override public void onComplete(Task<String> task) {
                    if (task.isSuccessful() && task.getResult() != null) {
                        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_TOKEN, task.getResult()).apply();
                    }
                    h.removeCallbacks(go);
                    launchOnce();
                }
            });
        } catch (Throwable t) { h.removeCallbacks(go); launchOnce(); }
    }

    private void launchOnce() {
        if (launched || isFinishing()) return;
        launched = true;
        launchTwa();
    }

    @Override protected Uri getLaunchingUrl() {
        Uri base = null;
        Intent i = getIntent();
        if (i != null) {
            Uri data = i.getData();
            if (data != null && "https".equals(data.getScheme()) && HOST.equals(data.getHost())) base = data;
            String extra = i.getStringExtra(EXTRA_URL);
            if (base == null && extra != null && extra.startsWith("/") && !extra.startsWith("//")) base = Uri.parse("https://" + HOST + extra);
        }
        if (base == null) base = super.getLaunchingUrl();
        SharedPreferences p = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String token = p.getString(KEY_TOKEN, null);
        Uri.Builder b = base.buildUpon().appendQueryParameter("app", "android");
        if (token != null) b.appendQueryParameter("fcm", token);
        return b.build();
    }
}
