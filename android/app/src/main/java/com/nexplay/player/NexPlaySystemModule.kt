package com.nexplay.player

import android.app.Activity
import android.content.Context
import android.media.AudioManager
import android.provider.Settings
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NexPlaySystemModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NexPlaySystemModule"

    private val audioManager: AudioManager? by lazy {
        reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }

    @ReactMethod
    fun getSystemVolume(promise: Promise) {
        try {
            val am = audioManager
            if (am == null) {
                promise.reject("AUDIO_NULL", "AudioManager not available")
                return
            }
            val currentVol = am.getStreamVolume(AudioManager.STREAM_MUSIC)
            val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val ratio = if (maxVol > 0) currentVol.toFloat() / maxVol.toFloat() else 0.5f

            val map = Arguments.createMap().apply {
                putDouble("volume", ratio.toDouble())
                putInt("current", currentVol)
                putInt("max", maxVol)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR_GET_VOLUME", e.message, e)
        }
    }

    @ReactMethod
    fun setSystemVolume(volumeRatio: Double, promise: Promise) {
        try {
            val am = audioManager
            if (am != null) {
                val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                val targetIndex = Math.round(volumeRatio.toFloat().coerceIn(0.0f, 1.0f) * maxVol).toInt()
                // Flag 0 avoids the default Android volume dialog popup so our custom HUD renders cleanly
                am.setStreamVolume(AudioManager.STREAM_MUSIC, targetIndex, 0)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_SET_VOLUME", e.message, e)
        }
    }

    @ReactMethod
    fun getScreenBrightness(promise: Promise) {
        try {
            val activity: Activity? = reactContext.currentActivity
            var brightness = activity?.window?.attributes?.screenBrightness ?: -1f
            if (brightness < 0f) {
                val systemBrightness = try {
                    Settings.System.getInt(
                        reactContext.contentResolver,
                        Settings.System.SCREEN_BRIGHTNESS
                    )
                } catch (e: Exception) {
                    128
                }
                brightness = systemBrightness / 255f
            }
            promise.resolve(brightness.coerceIn(0.01f, 1.0f).toDouble())
        } catch (e: Exception) {
            promise.reject("ERROR_GET_BRIGHTNESS", e.message, e)
        }
    }

    @ReactMethod
    fun setScreenBrightness(brightness: Double, promise: Promise) {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }
        activity.runOnUiThread {
            try {
                val lp = activity.window.attributes
                lp.screenBrightness = brightness.toFloat().coerceIn(0.01f, 1.0f)
                activity.window.attributes = lp
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR_SET_BRIGHTNESS", e.message, e)
            }
        }
    }

    @ReactMethod
    fun restoreScreenBrightness(promise: Promise) {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.resolve(true)
            return
        }
        activity.runOnUiThread {
            try {
                val lp = activity.window.attributes
                lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                activity.window.attributes = lp
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR_RESTORE_BRIGHTNESS", e.message, e)
            }
        }
    }
}
