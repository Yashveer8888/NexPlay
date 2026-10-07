package com.nexplay.player

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.SeekParameters
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter

@OptIn(UnstableApi::class)
class NexPlayPlayerView(context: Context) : FrameLayout(context), Player.Listener {

    private var player: ExoPlayer? = null
    private val playerView: PlayerView = PlayerView(context)
    private var currentUri: String? = null
    private var startPositionMs: Long = 0L

    private val progressHandler = Handler(Looper.getMainLooper())
    private val progressRunnable = object : Runnable {
        override fun run() {
            val p = player
            if (p != null && p.isPlaying) {
                emitStatusEvent()
                progressHandler.postDelayed(this, 250L)
            }
        }
    }

    private fun startProgressUpdates() {
        progressHandler.removeCallbacks(progressRunnable)
        progressHandler.post(progressRunnable)
    }

    private fun stopProgressUpdates() {
        progressHandler.removeCallbacks(progressRunnable)
    }

    init {
        val params = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        params.gravity = Gravity.CENTER
        playerView.layoutParams = params
        playerView.useController = false
        playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
        addView(playerView)

        initializePlayer()
    }

    private var lastSeekedMs: Long = -1L
    private var lastSeekTime: Long = 0L

    private fun initializePlayer() {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
            .build()

        val exo = ExoPlayer.Builder(context)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build()

        exo.setSeekParameters(SeekParameters.CLOSEST_SYNC)
        exo.addListener(this)
        playerView.player = exo
        player = exo
    }

    fun setVideoUri(uriString: String?, initialPositionMs: Long = 0L) {
        if (uriString.isNullOrEmpty() || uriString == currentUri) {
            return
        }
        currentUri = uriString
        startPositionMs = initialPositionMs
        lastSeekedMs = -1L
        lastSeekTime = 0L

        val mediaItem = MediaItem.fromUri(Uri.parse(uriString))
        val p = player ?: return
        p.setMediaItem(mediaItem)
        if (startPositionMs > 0) {
            p.seekTo(startPositionMs)
        }
        p.prepare()
        p.playWhenReady = true
    }

    fun setPaused(paused: Boolean) {
        player?.playWhenReady = !paused
        if (paused) {
            stopProgressUpdates()
            emitStatusEvent()
        } else {
            if (player?.isPlaying == true) {
                startProgressUpdates()
            }
        }
    }

    fun seekToMs(positionMs: Long) {
        if (positionMs < 0L) return
        val now = System.currentTimeMillis()
        if (positionMs == lastSeekedMs && (now - lastSeekTime) < 100L) return
        lastSeekedMs = positionMs
        lastSeekTime = now
        player?.seekTo(positionMs)
    }

    fun setSpeed(speed: Float) {
        player?.playbackParameters = PlaybackParameters(speed.coerceIn(0.25f, 3.0f))
    }

    fun setVolume(volume: Float) {
        player?.volume = volume.coerceIn(0.0f, 1.0f)
    }

    fun setResizeMode(mode: String) {
        when (mode.lowercase()) {
            "cover", "fill" -> playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FILL
            "zoom" -> playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
            "16:9" -> playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIXED_WIDTH
            "4:3" -> playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIXED_HEIGHT
            else -> playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
        }
    }

    fun setInitialPositionMs(posMs: Long) {
        if (posMs > 0 && startPositionMs == 0L) {
            startPositionMs = posMs
            player?.seekTo(posMs)
        }
    }

    fun selectAudioTrack(index: Int) {
        val p = player ?: return
        val currentTracks = p.currentTracks
        var audioIndex = 0
        val groups = currentTracks.groups
        for (gIdx in 0 until groups.size) {
            val group = groups[gIdx]
            if (group.type == C.TRACK_TYPE_AUDIO) {
                val trackGroup = group.mediaTrackGroup
                for (i in 0 until trackGroup.length) {
                    if (audioIndex == index) {
                        p.trackSelectionParameters = p.trackSelectionParameters.buildUpon()
                            .setOverrideForType(TrackSelectionOverride(trackGroup, i))
                            .build()
                        return
                    }
                    audioIndex++
                }
            }
        }
    }

    fun selectSubtitleTrack(index: Int) {
        val p = player ?: return
        if (index < 0) {
            p.trackSelectionParameters = p.trackSelectionParameters.buildUpon()
                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                .build()
            return
        }
        p.trackSelectionParameters = p.trackSelectionParameters.buildUpon()
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
            .build()

        val currentTracks = p.currentTracks
        var textIndex = 0
        val groups = currentTracks.groups
        for (gIdx in 0 until groups.size) {
            val group = groups[gIdx]
            if (group.type == C.TRACK_TYPE_TEXT) {
                val trackGroup = group.mediaTrackGroup
                for (i in 0 until trackGroup.length) {
                    if (textIndex == index) {
                        p.trackSelectionParameters = p.trackSelectionParameters.buildUpon()
                            .setOverrideForType(TrackSelectionOverride(trackGroup, i))
                            .build()
                        return
                    }
                    textIndex++
                }
            }
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        player?.currentTracks?.let { emitTracksEvent(it) }
        if (player?.isPlaying == true) {
            startProgressUpdates()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopProgressUpdates()
    }

    override fun onPlaybackStateChanged(playbackState: Int) {
        emitStatusEvent()
        if (playbackState == Player.STATE_READY) {
            player?.currentTracks?.let { emitTracksEvent(it) }
            if (player?.isPlaying == true) {
                startProgressUpdates()
            }
        } else if (playbackState == Player.STATE_ENDED) {
            stopProgressUpdates()
        }
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        emitStatusEvent()
        if (isPlaying) {
            startProgressUpdates()
        } else {
            stopProgressUpdates()
        }
    }

    override fun onTracksChanged(tracks: Tracks) {
        emitTracksEvent(tracks)
    }

    private fun emitStatusEvent() {
        val p = player ?: return
        val currentPos = p.currentPosition
        val durationVal = p.duration
        val bufferedPos = p.bufferedPosition
        val playing = p.isPlaying
        val state = p.playbackState

        val event: WritableMap = Arguments.createMap().apply {
            putDouble("position", currentPos.toDouble())
            putDouble("duration", durationVal.coerceAtLeast(0L).toDouble())
            putDouble("bufferedPosition", bufferedPos.toDouble())
            putBoolean("isPlaying", playing)
            putBoolean("isBuffering", state == Player.STATE_BUFFERING)
            putBoolean("isEnded", state == Player.STATE_ENDED)
        }

        val reactContext = context as ReactContext
        reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(
            id,
            "onPlayerStatus",
            event
        )
    }

    private fun emitTracksEvent(tracks: Tracks) {
        val audioTracks: WritableArray = Arguments.createArray()
        val subtitleTracks: WritableArray = Arguments.createArray()

        var audioCount = 0
        var subCount = 0

        val groups = tracks.groups
        for (gIdx in 0 until groups.size) {
            val group = groups[gIdx]
            val trackGroup = group.mediaTrackGroup
            for (i in 0 until trackGroup.length) {
                val format = trackGroup.getFormat(i)
                val lang = format.language ?: "und"
                val displayLabel = if (!format.label.isNullOrEmpty()) {
                    format.label
                } else if (lang != "und") {
                    try {
                        java.util.Locale(lang).getDisplayLanguage(java.util.Locale.ENGLISH).ifEmpty { lang }
                    } catch (_: Exception) {
                        lang
                    }
                } else {
                    "Track ${if (group.type == C.TRACK_TYPE_AUDIO) audioCount + 1 else subCount + 1}"
                }

                val trackMap = Arguments.createMap().apply {
                    putInt("id", i)
                    putString("label", displayLabel)
                    putString("language", lang)
                    putString("mimeType", format.sampleMimeType ?: "")
                    putInt("channelCount", format.channelCount)
                    putBoolean("isSelected", group.isTrackSelected(i))
                }
                if (group.type == C.TRACK_TYPE_AUDIO) {
                    trackMap.putInt("index", audioCount++)
                    audioTracks.pushMap(trackMap)
                } else if (group.type == C.TRACK_TYPE_TEXT) {
                    trackMap.putInt("index", subCount++)
                    subtitleTracks.pushMap(trackMap)
                }
            }
        }

        val event: WritableMap = Arguments.createMap().apply {
            putArray("audioTracks", audioTracks)
            putArray("subtitleTracks", subtitleTracks)
        }

        val reactContext = context as ReactContext
        reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(
            id,
            "onTracksChanged",
            event
        )
    }

    fun releasePlayer() {
        stopProgressUpdates()
        player?.removeListener(this)
        player?.release()
        player = null
    }

    private fun String?.isNull_or_empty(): Boolean = this == null || this.isEmpty()
}
