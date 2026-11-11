#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
: "${ANDROID_BUILD_TOOLS:?Set ANDROID_BUILD_TOOLS to Android build-tools 35.0.0}"
: "${ANDROID_PLATFORM_JAR:?Set ANDROID_PLATFORM_JAR to the API 35 android.jar}"
: "${ANDROID_KEYSTORE:?Set ANDROID_KEYSTORE to the private signing keystore}"
: "${ANDROID_KEYSTORE_PASSWORD:?Set the signing password}"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17}"
OUT="${ANDROID_BUILD_OUTPUT:-$ROOT/build}"
mkdir -p "$OUT/classes" "$OUT/dex"
"$ANDROID_BUILD_TOOLS/aapt2" compile --dir "$ROOT/res" -o "$OUT/resources.zip"
"$ANDROID_BUILD_TOOLS/aapt2" link -o "$OUT/unsigned.apk" -I "$ANDROID_PLATFORM_JAR" \
    --manifest "$ROOT/AndroidManifest.xml" "$OUT/resources.zip"
"$JAVA_HOME/bin/javac" --release 8 -classpath "$ANDROID_PLATFORM_JAR" \
    -d "$OUT/classes" "$ROOT/src/app/attendifier/mobile/MainActivity.java"
"$JAVA_HOME/bin/jar" cf "$OUT/classes.jar" -C "$OUT/classes" .
"$JAVA_HOME/bin/java" -cp "$ANDROID_BUILD_TOOLS/lib/d8.jar" com.android.tools.r8.D8 \
    --min-api 23 --lib "$ANDROID_PLATFORM_JAR" --output "$OUT/dex" "$OUT/classes.jar"
(cd "$OUT/dex" && zip -q "$OUT/unsigned.apk" classes.dex)
"$ANDROID_BUILD_TOOLS/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
"$JAVA_HOME/bin/java" -jar "$ANDROID_BUILD_TOOLS/lib/apksigner.jar" sign \
    --ks "$ANDROID_KEYSTORE" --ks-key-alias attendifier \
    --ks-pass env:ANDROID_KEYSTORE_PASSWORD --key-pass env:ANDROID_KEYSTORE_PASSWORD \
    --out "$OUT/AttendiFier-v1.1.apk" "$OUT/aligned.apk"
"$JAVA_HOME/bin/java" -jar "$ANDROID_BUILD_TOOLS/lib/apksigner.jar" verify "$OUT/AttendiFier-v1.1.apk"
"$ANDROID_BUILD_TOOLS/aapt2" dump badging "$OUT/AttendiFier-v1.1.apk"