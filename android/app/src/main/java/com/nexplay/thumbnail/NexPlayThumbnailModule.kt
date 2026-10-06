package com.nexplay.thumbnail

import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest

class NexPlayThumbnailModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val moduleScope = CoroutineScope(Dispatchers.IO + Job())

    override fun getName(): String = "NexPlayThumbnail"

    private fun getCacheDir(): File {
        val cacheDir = File(reactContext.cacheDir, "nexplay_thumbnails")
        if (!cacheDir.exists()) {
            cacheDir.mkdirs()
        }
        return cacheDir
    }

    private fun hashString(input: String): String {
        val bytes = MessageDigest.getInstance("MD5").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    @ReactMethod
    fun generateThumbnail(filePath: String, timeMs: Double, promise: Promise) {
        moduleScope.launch {
            try {
                val thumbnailFile = extractOrGetThumbnail(filePath, (timeMs * 1000).toLong())
                withContext(Dispatchers.Main) {
                    if (thumbnailFile != null && thumbnailFile.exists()) {
                        promise.resolve(Uri.fromFile(thumbnailFile).toString())
                    } else {
                        promise.resolve(null)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("THUMB_ERROR", e.localizedMessage, e)
                }
            }
        }
    }

    @ReactMethod
    fun generateBatchThumbnails(filePaths: ReadableArray, promise: Promise) {
        moduleScope.launch {
            try {
                val resultMap: WritableMap = Arguments.createMap()
                for (i in 0 until filePaths.size()) {
                    val path = filePaths.getString(i) ?: continue
                    val thumbFile = extractOrGetThumbnail(path, 1000000L) // 1 sec
                    if (thumbFile != null && thumbFile.exists()) {
                        resultMap.putString(path, Uri.fromFile(thumbFile).toString())
                    }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("BATCH_THUMB_ERROR", e.localizedMessage, e)
                }
            }
        }
    }

    private fun extractOrGetThumbnail(filePath: String, timeUs: Long): File? {
        val hash = hashString(filePath)
        val cacheDir = getCacheDir()
        val outputFile = File(cacheDir, "thumb_$hash.jpg")

        if (outputFile.exists() && outputFile.length() > 0) {
            return outputFile
        }

        var retriever: MediaMetadataRetriever? = null
        try {
            retriever = MediaMetadataRetriever()
            if (filePath.startsWith("content://")) {
                retriever.setDataSource(reactContext, Uri.parse(filePath))
            } else {
                retriever.setDataSource(filePath)
            }

            var bitmap: Bitmap? = retriever.getFrameAtTime(
                timeUs,
                MediaMetadataRetriever.OPTION_CLOSEST_SYNC
            )
            if (bitmap == null) {
                bitmap = retriever.frameAtTime
            }

            if (bitmap != null) {
                val targetWidth = 480
                val aspectRatio = bitmap.height.toFloat() / bitmap.width.toFloat()
                val targetHeight = (targetWidth * aspectRatio).toInt().coerceAtLeast(1)

                val scaledBitmap = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)

                FileOutputStream(outputFile).use { out ->
                    scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 80, out)
                }
                if (scaledBitmap != bitmap) {
                    scaledBitmap.recycle()
                }
                bitmap.recycle()
                return outputFile
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            try {
                retriever?.release()
            } catch (e: Exception) {
                // ignore
            }
        }
        return null
    }
}
