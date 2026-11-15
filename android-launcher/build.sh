#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
: "${ANDROID_BUILD_TOOLS:?Set ANDROID_BUILD_TOOLS to Android build-tools 35.0.0}"
: "${ANDROID_PLATFORM_JAR:?Set ANDROID_PLATFORM_JAR to the API 35 android.jar}"
: "${ANDROID_KEYSTORE:?Set ANDROID_KEYSTORE to the private signing keystore}"
: "${ANDROID_KEYSTORE_PASSWORD:?Set the signing password}"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17}"
VERSION="${ATTENDIFIER_VERSION:-1.3}"
OUT="${ANDROID_BUILD_OUTPUT:-$ROOT/build}"
APK="$OUT/AttendiFier-v$VERSION.apk"
LIBS="$OUT/libs"
mkdir -p "$OUT/classes" "$OUT/dex" "$LIBS"

# Pinned AndroidX libraries for Trusted Web Activity (full-screen, no address bar).
GOOGLE=https://dl.google.com/dl/android/maven2
fetch() { # url file sha256 [aar]
  local url="$1" file="$LIBS/$2" sum="$3"
  if ! echo "$sum  $file" | sha256sum -c --status 2>/dev/null; then curl -fsSL -o "$file" "$url"; fi
  echo "$sum  $file" | sha256sum -c --quiet
  if test "${4:-}" = aar; then unzip -p "$file" classes.jar > "${file%.aar}.jar"; fi
}
fetch "$GOOGLE/androidx/browser/browser/1.8.0/browser-1.8.0.aar" browser.aar 2d6167b33bf6a064c37501501543702349e850ac62c732d1efa4e71063675456 aar
fetch "$GOOGLE/androidx/core/core/1.1.0/core-1.1.0.aar" core.aar 76c7cfbe596fe3c09a6983bf1c89e889299c08ac9a3b52ce5182a088d056647e aar
fetch "$GOOGLE/androidx/collection/collection/1.1.0/collection-1.1.0.jar" collection.jar 632a0e5407461de774409352940e292a291037724207a787820c77daf7d33b72
fetch "$GOOGLE/androidx/concurrent/concurrent-futures/1.0.0/concurrent-futures-1.0.0.jar" futures.jar 5595a40e278a7b39fa78a09490e3d7f3faa95c7b01447148bd38b5ade0605c35
fetch "$GOOGLE/androidx/annotation/annotation/1.2.0/annotation-1.2.0.jar" annotation.jar 9029262bddce116e6d02be499e4afdba21f24c239087b76b3b57d7e98b490a36
fetch "https://repo1.maven.org/maven2/com/google/guava/listenablefuture/1.0/listenablefuture-1.0.jar" listenablefuture.jar e4ad7607e5c0477c6f890ef26a49cb8d1bb4dffb650bab4502afee64644e3069
LIB_JARS=("$LIBS/browser.jar" "$LIBS/core.jar" "$LIBS/collection.jar" "$LIBS/futures.jar" "$LIBS/listenablefuture.jar")
CLASSPATH="$ANDROID_PLATFORM_JAR:$(IFS=:; echo "${LIB_JARS[*]}"):$LIBS/annotation.jar"

"$ANDROID_BUILD_TOOLS/aapt2" compile --dir "$ROOT/res" -o "$OUT/resources.zip"
"$ANDROID_BUILD_TOOLS/aapt2" link -o "$OUT/unsigned.apk" -I "$ANDROID_PLATFORM_JAR" \
    --manifest "$ROOT/AndroidManifest.xml" "$OUT/resources.zip"
"$JAVA_HOME/bin/javac" --release 8 -classpath "$CLASSPATH" \
    -d "$OUT/classes" "$ROOT/src/app/attendifier/mobile/MainActivity.java"
"$JAVA_HOME/bin/jar" cf "$OUT/classes.jar" -C "$OUT/classes" .
# R8 keeps only the library code MainActivity actually uses.
"$JAVA_HOME/bin/java" -cp "$ANDROID_BUILD_TOOLS/lib/d8.jar" com.android.tools.r8.R8 \
    --release --min-api 23 --lib "$ANDROID_PLATFORM_JAR" --classpath "$LIBS/annotation.jar" \
    --pg-conf "$ROOT/proguard-rules.pro" --output "$OUT/dex" "$OUT/classes.jar" "${LIB_JARS[@]}"
(cd "$OUT/dex" && zip -q "$OUT/unsigned.apk" classes.dex)
"$ANDROID_BUILD_TOOLS/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
"$JAVA_HOME/bin/java" -jar "$ANDROID_BUILD_TOOLS/lib/apksigner.jar" sign \
    --ks "$ANDROID_KEYSTORE" --ks-key-alias attendifier \
    --ks-pass env:ANDROID_KEYSTORE_PASSWORD --key-pass env:ANDROID_KEYSTORE_PASSWORD \
    --out "$APK" "$OUT/aligned.apk"
"$JAVA_HOME/bin/java" -jar "$ANDROID_BUILD_TOOLS/lib/apksigner.jar" verify --print-certs "$APK"
"$ANDROID_BUILD_TOOLS/aapt2" dump badging "$APK" | head -3
sha256sum "$APK"
