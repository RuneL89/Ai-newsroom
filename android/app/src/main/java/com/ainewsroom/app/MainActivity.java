package com.ainewsroom.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "MainActivity created — plugins auto-discovered");
    }

    @Override
    public void onPause() {
        // Don't pause WebView timers — let JavaScript keep running when app backgrounds
        // The Foreground Service keeps the process alive, and we want the pipeline to continue
        Log.d(TAG, "onPause — skipping pauseTimers to keep JS running");
        super.onPause();
    }
}
