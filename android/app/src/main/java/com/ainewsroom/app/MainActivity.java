package com.ainewsroom.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(PipelineStatusPlugin.class);
        Log.d(TAG, "MainActivity created — PipelineStatusPlugin registered");
    }

    @Override
    public void onPause() {
        // Don't pause WebView timers — let JavaScript keep running when app backgrounds
        Log.d(TAG, "onPause — skipping pauseTimers to keep JS running");
        super.onPause();
    }
}
