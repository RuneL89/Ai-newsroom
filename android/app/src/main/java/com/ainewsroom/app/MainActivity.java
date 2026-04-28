package com.ainewsroom.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PipelineStatusPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        // Don't pause WebView timers — let JavaScript keep running when app backgrounds
        // The Foreground Service keeps the process alive, and we want the pipeline to continue
        super.onPause();
    }
}
