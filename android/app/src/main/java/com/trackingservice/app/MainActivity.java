package com.trackingservice.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Let the application draw cleanly behind Android's system bars while
        // CSS applies the correct safe-area padding for each device.
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            );
        }

        // Pastikan WebView selalu update dengan asset terbaru tanpa konflik cache lama
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings webSettings = webView.getSettings();
            webSettings.setDomStorageEnabled(true);
            webSettings.setDatabaseEnabled(true);
            webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
            // The web document handles vertical scrolling. Disabling Android's
            // nested-scroll handoff prevents one-finger gestures from being
            // intercepted by the CoordinatorLayout on some Samsung WebViews.
            webView.setNestedScrollingEnabled(false);
            webView.setVerticalScrollBarEnabled(true);
            webView.setOverScrollMode(View.OVER_SCROLL_ALWAYS);
        }
    }
}
