package app.attendifier.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;

/** Uses the phone's browser to preserve HTTPS camera and passkey support. */
public final class MainActivity extends Activity {
    private static final String APP_URL = "https://present-snap-connect.lovable.app";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(APP_URL));
        Intent serviceIntent = new Intent("android.support.customtabs.action.CustomTabsService");
        ResolveInfo defaultBrowser = getPackageManager().resolveActivity(intent, 0);
        if (defaultBrowser != null) {
            serviceIntent.setPackage(defaultBrowser.activityInfo.packageName);
            if (getPackageManager().resolveService(serviceIntent, 0) != null) {
                intent.setPackage(defaultBrowser.activityInfo.packageName);
                Bundle extras = new Bundle();
                extras.putBinder("android.support.customtabs.extra.SESSION", null);
                intent.putExtras(extras);
                intent.putExtra("android.support.customtabs.extra.EXTRA_ENABLE_INSTANT_APPS", false);
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
}