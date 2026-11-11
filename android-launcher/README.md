# AttendiFier for Android

Version 1.1 is a signed Android **browser-backed launcher** for
https://present-snap-connect.lovable.app. It opens a Custom Tab in the default
browser when available, otherwise a normal browser tab. The browser address bar
is intentional; this is not a standalone offline native app or an embedded WebView.

Android 6.0+ and an enabled HTTPS-capable browser are required. Camera access,
fingerprint/passkey support, downloads, and account storage remain handled by the
browser. Existing registrations on that same browser stay available. Biometric
availability still depends on the phone and browser. Changing the browser changes
which browser-local student and practice records are available.

No live attendance records, SMS credentials, backend credentials, or signing keys
are packaged in this APK. Live rules and notifications remain on the published site.

## Build

Install JDK 17, Android build-tools 35.0.0, and Android API 35. Set `JAVA_HOME`,
`ANDROID_BUILD_TOOLS`, `ANDROID_PLATFORM_JAR`, `ANDROID_KEYSTORE`, and
`ANDROID_KEYSTORE_PASSWORD`, then run `bash android-launcher/build.sh`.
The keystore alias is `attendifier`. Keep the original signing key private:
Android updates require the same signing key. Never commit keys or passwords.

The `android-release.yml` GitHub workflow uses encrypted repository secrets
`ANDROID_KEYSTORE_BASE64` and `ANDROID_KEYSTORE_PASSWORD` to reproduce this APK.
Device installation, camera, and fingerprint checks must be done on a real phone;
an APK signature check does not verify these hardware-dependent flows.