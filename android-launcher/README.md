# AttendiFier for Android

Version 1.3 opens https://attendifier.lovable.app **full screen, without
the browser address bar**, as a Trusted Web Activity in the phone's browser
(Chrome, Samsung Internet, Edge and other supporting browsers). Camera access,
fingerprint/passkey support, downloads and saved data stay in the browser, exactly
like v1.1. If the browser cannot open it full screen, it falls back to the v1.1
behaviour (a Custom Tab with the address bar).

The address bar is hidden only while the website serves
`public/.well-known/assetlinks.json`, which lists the package
`app.attendifier.mobile` and the SHA-256 fingerprint of the signing certificate.
Keep that file published and keep signing with the same key.

Android 6.0+ and internet access are required. No attendance records, SMS
credentials, backend credentials or signing keys are packaged in this APK.

## Build

Install JDK 17, Android build-tools 35.0.0 and Android API 35. Set `JAVA_HOME`,
`ANDROID_BUILD_TOOLS`, `ANDROID_PLATFORM_JAR`, `ANDROID_KEYSTORE` and
`ANDROID_KEYSTORE_PASSWORD`, then run `bash android-launcher/build.sh`.
`build.sh` downloads pinned, checksum-verified AndroidX Browser libraries and
shrinks them with R8. The keystore alias is `attendifier`. Android updates require
the same signing key. Never commit keys or passwords.

The `android-release.yml` workflow (Actions → Build Android APK → Run workflow)
builds, signs with the encrypted repository secrets `ANDROID_KEYSTORE_BASE64` and
`ANDROID_KEYSTORE_PASSWORD`, and publishes the APK to the matching GitHub release.
Device installation, camera and fingerprint checks must be done on a real phone.
