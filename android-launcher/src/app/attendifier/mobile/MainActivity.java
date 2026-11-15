package app.attendifier.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;

import java.util.List;

/**
 * Opens AttendiFier full screen as a Trusted Web Activity (no address bar) in the phone's
 * browser, so camera, fingerprint/passkey, downloads and saved data keep working.
 * The address bar is hidden only when the website's /.well-known/assetlinks.json lists this
 * app's package and signing certificate; otherwise the browser safely shows it.
 */
public final class MainActivity extends Activity {
    private static final String APP_URL = "https://attendifier.lovable.app";
    private static final String CHROME = "com.android.chrome";

    private CustomTabsServiceConnection connection;
    private boolean launched;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        String provider = findTrustedWebActivityProvider();
        if (provider == null || !bindProvider(provider)) {
            launchInBrowser();
        }
    }

    private String findTrustedWebActivityProvider() {
        PackageManager pm = getPackageManager();
        ResolveInfo defaultBrowser =
            pm.resolveActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(APP_URL)), 0);
        if (defaultBrowser != null && supportsTrustedWebActivity(defaultBrowser.activityInfo.packageName)) {
            return defaultBrowser.activityInfo.packageName;
        }
        return supportsTrustedWebActivity(CHROME) ? CHROME : null;
    }

    private boolean supportsTrustedWebActivity(String packageName) {
        Intent service = new Intent(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION);
        service.addCategory(CustomTabsService.TRUSTED_WEB_ACTIVITY_CATEGORY);
        service.setPackage(packageName);
        List<ResolveInfo> found = getPackageManager().queryIntentServices(service, 0);
        return found != null && !found.isEmpty();
    }

    private boolean bindProvider(String provider) {
        connection = new CustomTabsServiceConnection() {
            @Override public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
                if (launched) return;
                launched = true;
                try {
                    client.warmup(0);
                    CustomTabsSession session = client.newSession(null);
                    if (session == null) { launchInBrowser(); return; }
                    new TrustedWebActivityIntentBuilder(Uri.parse(APP_URL))
                        .build(session)
                        .launchTrustedWebActivity(MainActivity.this);
                    finish();
                } catch (RuntimeException error) {
                    launchInBrowser();
                }
            }

            @Override public void onServiceDisconnected(ComponentName name) { }
        };
        boolean bound;
        try {
            bound = CustomTabsClient.bindCustomTabsService(this, provider, connection);
        } catch (RuntimeException error) {
            bound = false;
        }
        if (!bound) connection = null;
        return bound;
    }

    /** Fallback used by v1.1: a Custom Tab, or a normal browser tab. */
    private void launchInBrowser() {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(APP_URL));
        Intent serviceIntent = new Intent(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION);
        ResolveInfo defaultBrowser = getPackageManager().resolveActivity(intent, 0);
        if (defaultBrowser != null) {
            serviceIntent.setPackage(defaultBrowser.activityInfo.packageName);
            if (getPackageManager().resolveService(serviceIntent, 0) != null) {
                intent.setPackage(defaultBrowser.activityInfo.packageName);
                Bundle extras = new Bundle();
                extras.putBinder("android.support.customtabs.extra.SESSION", null);
                intent.putExtras(extras);
            }
        }
        try {
            startActivity(intent);
            finish();
        } catch (ActivityNotFoundException error) {
            new AlertDialog.Builder(this)
                .setTitle("A browser is needed")
                .setMessage("Install or enable Chrome or another web browser, then reopen AttendiFier.")
                .setPositiveButton("Close", (dialog, which) -> finish())
                .setCancelable(false)
                .show();
        }
    }

    @Override protected void onDestroy() {
        if (connection != null) {
            try { unbindService(connection); } catch (IllegalArgumentException ignored) { }
            connection = null;
        }
        super.onDestroy();
    }
}
