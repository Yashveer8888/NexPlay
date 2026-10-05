package com.nexplay.scanner

import android.content.ContentResolver
import android.content.ContentUris
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class NexPlayScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val moduleScope = CoroutineScope(Dispatchers.IO + Job())

    override fun getName(): String = "NexPlayScanner"

    @ReactMethod
    fun checkStoragePermission(promise: Promise) {
        try {
            val isGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(
                    reactContext,
                    android.Manifest.permission.READ_MEDIA_VIDEO
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                ContextCompat.checkSelfPermission(
                    reactContext,
                    android.Manifest.permission.READ_EXTERNAL_STORAGE
                ) == PackageManager.PERMISSION_GRANTED
            }
            promise.resolve(isGranted)
        } catch (e: Exception) {
            promise.reject("PERM_ERROR", e.localizedMessage, e)
        }
    }

    @ReactMethod
    fun scanMediaLibrary(promise: Promise) {
        moduleScope.launch {
            try {
                val videoList = Arguments.createArray()
                val resolver: ContentResolver = reactContext.contentResolver

                val projection = arrayOf(
                    MediaStore.Video.Media._ID,
                    MediaStore.Video.Media.DATA,
                    MediaStore.Video.Media.DISPLAY_NAME,
                    MediaStore.Video.Media.SIZE,
                    MediaStore.Video.Media.DURATION,
                    MediaStore.Video.Media.WIDTH,
                    MediaStore.Video.Media.HEIGHT,
                    MediaStore.Video.Media.MIME_TYPE,
                    MediaStore.Video.Media.DATE_ADDED,
                    MediaStore.Video.Media.DATE_MODIFIED,
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        MediaStore.Video.Media.RELATIVE_PATH
                    } else {
                        MediaStore.Video.Media.DATA
                    }
                )

                val collection: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
                } else {
                    MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                }

                val sortOrder = "${MediaStore.Video.Media.DATE_MODIFIED} DESC"

                val cursor: Cursor? = resolver.query(
                    collection,
                    projection,
                    null,
                    null,
                    sortOrder
                )

                cursor?.use { c ->
                    val idColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
                    val dataColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media.DATA)
                    val nameColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)
                    val sizeColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE)
                    val durationColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media.DURATION)
                    val widthColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media.WIDTH)
                    val heightColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media.HEIGHT)
                    val mimeColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media.MIME_TYPE)
                    val dateAddedColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media.DATE_ADDED)
                    val dateModifiedColumn = c.getColumnIndexOrThrow(MediaStore.Video.Media.DATE_MODIFIED)

                    val folderCol = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        c.getColumnIndex(MediaStore.Video.Media.RELATIVE_PATH)
                    } else {
                        -1
                    }

                    var count = 0
                    val total = c.count

                    while (c.moveToNext()) {
                        val id = c.getLong(idColumn)
                        val filePath = c.getString(dataColumn) ?: ""
                        val name = c.getString(nameColumn) ?: File(filePath).name
                        val size = c.getLong(sizeColumn)
                        val duration = c.getLong(durationColumn)
                        val width = c.getInt(widthColumn)
                        val height = c.getInt(heightColumn)
                        val mimeType = c.getString(mimeColumn) ?: "video/*"
                        val dateAdded = c.getLong(dateAddedColumn)
                        val dateModified = c.getLong(dateModifiedColumn)

                        val contentUri = ContentUris.withAppendedId(collection, id).toString()

                        var folderName = "Internal Storage"
                        if (folderCol != -1 && !c.isNull(folderCol)) {
                            val relPath = c.getString(folderCol)
                            if (!relPath.isNull_or_empty()) {
                                folderName = relPath.trimEnd('/')
                            }
                        } else if (filePath.isNotEmpty()) {
                            val parent = File(filePath).parentFile
                            if (parent != null) {
                                folderName = parent.name
                            }
                        }

                        val videoMap: WritableMap = Arguments.createMap().apply {
                            putString("id", id.toString())
                            putString("uri", contentUri)
                            putString("path", filePath)
                            putString("filename", name)
                            putDouble("size", size.toDouble())
                            putDouble("duration", duration.toDouble())
                            putInt("width", width)
                            putInt("height", height)
                            putString("mimeType", mimeType)
                            putDouble("dateAdded", dateAdded.toDouble())
                            putDouble("dateModified", dateModified.toDouble())
                            putString("folder", folderName)
                        }

                        videoList.pushMap(videoMap)
                        count++

                        if (count % 50 == 0 || count == total) {
                            sendProgressEvent(count, total)
                        }
                    }
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(videoList)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("SCAN_ERROR", e.localizedMessage, e)
                }
            }
        }
    }

    private fun sendProgressEvent(scanned: Int, total: Int) {
        val params = Arguments.createMap().apply {
            putInt("scanned", scanned)
            putInt("total", total)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onScanProgress", params)
    }

    private fun String?.isNull_or_empty(): Boolean = this == null || this.isEmpty()
}
