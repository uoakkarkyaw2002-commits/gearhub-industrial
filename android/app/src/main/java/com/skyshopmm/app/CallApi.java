package com.skyshopmm.app;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Tells the server, without a signed-in page, that this phone declined a call (the key arrived only in this phone's Firebase message). */
final class CallApi {
    private CallApi() { }

    static void decline(final String callId, final String key) {
        if (callId == null || key == null || callId.isEmpty() || key.isEmpty()) return;
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL("https://" + MainActivity.HOST + "/api/platform/call/" + callId + "/decline-key").openConnection();
                    c.setRequestMethod("POST");
                    c.setConnectTimeout(8000);
                    c.setReadTimeout(8000);
                    c.setDoOutput(true);
                    c.setRequestProperty("Content-Type", "application/json");
                    c.setRequestProperty("Origin", "https://" + MainActivity.HOST);
                    OutputStream o = c.getOutputStream();
                    o.write(("{\"key\":\"" + key.replaceAll("[^A-Za-z0-9]", "") + "\"}").getBytes("UTF-8"));
                    o.close();
                    c.getResponseCode();
                    c.disconnect();
                } catch (Throwable ignored) { }
            }
        }).start();
    }
}
