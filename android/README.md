# SkyShopMM — native Android app (1.1.359 →)

The app opens skyshopmm.com in Chrome as a **Trusted Web Activity** (so Google sign-in, camera, microphone and WebRTC calls keep working
exactly as on the website), and adds what a website cannot do: **alerts through Firebase Cloud Messaging**, a notification permission
asked the Android way, and a **full-screen incoming call over the lock screen**.

- Package `com.skyshopmm.app` — the same as the app live on Google Play now, so this is an *update* of it. It must be signed with the
  same upload key (`signing.keystore`) that the first version was built with.
- `MainActivity` asks for the notification permission, gets the phone's Firebase address, and opens the site with `?app=android&fcm=<token>`;
  the page (`public/user-data.js`) saves the token on the signed-in person (`POST /api/platform/native-push/token`).
- `PushService` receives the server's data messages (`lib/native-push.js`): chat/order alerts, and `call` → `CallActivity` (full screen, ringtone,
  vibration) until `call-end`.
- Nothing secret is in this folder. Firebase's `app/google-services.json` (not secret) is added by the owner; the Firebase service account
  (secret) goes into Render env `FCM_SERVICE_ACCOUNT`. The keystore never goes into git (`.gitignore`).

## Build (Mac)
Needs JDK 17 and the Android SDK (platform 35, build-tools 35.0.0).
```
cd android
echo "sdk.dir=$HOME/android-dev/sdk" > local.properties
gradle assembleDebug          # android/app/build/outputs/apk/debug/app-debug.apk  (test on a phone)
```
Release for Google Play (an AAB signed with the SAME upload key as the live app; never commit it):
```
# android/keystore.properties  (git-ignored)
storeFile=/path/to/signing.keystore
storePassword=...
keyAlias=...
keyPassword=...
gradle bundleRelease -PversionCode=3 -PversionName=2.0.0   # android/app/build/outputs/bundle/release/app-release.aab
```
`versionCode` must be higher than the one on Play (the PWABuilder build was 2).

## Digital Asset Links
`https://skyshopmm.com/.well-known/assetlinks.json` already lists the upload key and Google's app-signing key. A debug build uses another key, so
it shows Chrome's address bar until that key's SHA-256 is added to Render env `ANDROID_SHA256` (comma separated).
