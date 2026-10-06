package com.nexplay.player

import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class NexPlayPlayerViewManager : SimpleViewManager<NexPlayPlayerView>() {

    override fun getName(): String = "NexPlayPlayerView"

    override fun createViewInstance(reactContext: ThemedReactContext): NexPlayPlayerView {
        return NexPlayPlayerView(reactContext)
    }

    override fun onDropViewInstance(view: NexPlayPlayerView) {
        super.onDropViewInstance(view)
        view.releasePlayer()
    }

    @ReactProp(name = "videoUri")
    fun setVideoUri(view: NexPlayPlayerView, uri: String?) {
        view.setVideoUri(uri)
    }

    @ReactProp(name = "initialPositionMs")
    fun setInitialPositionMs(view: NexPlayPlayerView, initialPos: Double) {
        view.setInitialPositionMs(initialPos.toLong())
    }

    @ReactProp(name = "paused")
    fun setPaused(view: NexPlayPlayerView, paused: Boolean) {
        view.setPaused(paused)
    }

    @ReactProp(name = "seekToMs")
    fun setSeekToMs(view: NexPlayPlayerView, seekToMs: Double) {
        view.seekToMs(seekToMs.toLong())
    }

    @ReactProp(name = "speed")
    fun setSpeed(view: NexPlayPlayerView, speed: Float) {
        view.setSpeed(speed)
    }

    @ReactProp(name = "volume")
    fun setVolume(view: NexPlayPlayerView, volume: Float) {
        view.setVolume(volume)
    }

    @ReactProp(name = "resizeMode")
    fun setResizeMode(view: NexPlayPlayerView, mode: String?) {
        view.setResizeMode(mode ?: "contain")
    }

    @ReactProp(name = "audioTrackIndex")
    fun setAudioTrackIndex(view: NexPlayPlayerView, index: Int) {
        view.selectAudioTrack(index)
    }

    @ReactProp(name = "subtitleTrackIndex")
    fun setSubtitleTrackIndex(view: NexPlayPlayerView, index: Int) {
        view.selectSubtitleTrack(index)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.of(
            "onPlayerStatus",
            MapBuilder.of("registrationName", "onPlayerStatus"),
            "onTracksChanged",
            MapBuilder.of("registrationName", "onTracksChanged")
        )
    }
}
