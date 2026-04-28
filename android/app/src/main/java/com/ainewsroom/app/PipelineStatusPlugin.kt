package com.ainewsroom.app

import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "PipelineStatus")
class PipelineStatusPlugin : Plugin() {

    @PluginMethod
    fun start(call: PluginCall) {
        val status = call.getString("status", "Pipeline running...")

        val intent = Intent(context, PipelineService::class.java).apply {
            action = PipelineService.ACTION_START
            putExtra(PipelineService.EXTRA_STATUS, status)
        }
        context.startForegroundService(intent)

        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }

    @PluginMethod
    fun updateStatus(call: PluginCall) {
        val status = call.getString("status", "Pipeline running...")

        val intent = Intent(context, PipelineService::class.java).apply {
            action = PipelineService.ACTION_UPDATE
            putExtra(PipelineService.EXTRA_STATUS, status)
        }
        context.startService(intent)

        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        val intent = Intent(context, PipelineService::class.java).apply {
            action = PipelineService.ACTION_STOP
        }
        context.startService(intent)

        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }
}
