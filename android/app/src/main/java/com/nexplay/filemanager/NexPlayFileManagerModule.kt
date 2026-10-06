package com.nexplay.filemanager

import android.content.ContentUris
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import com.facebook.react.bridge.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class NexPlayFileManagerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val moduleScope = CoroutineScope(Dispatchers.IO + Job())

    override fun getName(): String = "NexPlayFileManager"

    private fun getVaultDirectory(): File {
        val externalDir = reactContext.getExternalFilesDir(null)
        val vault = if (externalDir != null) {
            File(externalDir, "nexplay_vault")
        } else {
            File(reactContext.filesDir, "nexplay_vault")
        }
        if (!vault.exists()) {
            vault.mkdirs()
        }
        val noMedia = File(vault, ".nomedia")
        if (!noMedia.exists()) {
            try {
                noMedia.createNewFile()
            } catch (_: Exception) {}
        }
        return vault
    }

    private fun deleteMediaByPathOrId(path: String, idStr: String? = null): Boolean {
        // 1. Direct ContentResolver delete by ID (non-blocking)
        val idLong = idStr?.toLongOrNull()
        if (idLong != null) {
            try {
                val itemUri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, idLong)
                reactContext.contentResolver.delete(itemUri, null, null)
            } catch (_: Exception) {}
        }

        // 2. Unlink physical file if still present
        try {
            val file = File(path)
            if (file.exists()) {
                file.delete()
            }
        } catch (_: Exception) {}

        return true
    }

    @ReactMethod
    fun checkAllFilesPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                promise.resolve(Environment.isExternalStorageManager())
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestAllFilesPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (Environment.isExternalStorageManager()) {
                    promise.resolve(true)
                    return
                }
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                        data = Uri.parse("package:${reactContext.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(intent)
                } catch (_: Exception) {
                    val fallbackIntent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(fallbackIntent)
                }
                promise.resolve(false)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("PERM_ERROR", e.localizedMessage, e)
        }
    }

    @ReactMethod
    fun deleteFiles(paths: ReadableArray, promise: Promise) {
        moduleScope.launch {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
                withContext(Dispatchers.Main) {
                    promise.reject("PERMISSION_DENIED", "All Files Access permission is required to delete videos permanently.")
                }
                return@launch
            }

            var deletedCount = 0
            var failedCount = 0
            val scannedPaths = mutableListOf<String>()

            for (i in 0 until paths.size()) {
                val filePath = paths.getString(i) ?: continue
                val success = deleteMediaByPathOrId(filePath)
                scannedPaths.add(filePath)
                if (success) {
                    deletedCount++
                } else {
                    failedCount++
                }
            }

            if (scannedPaths.isNotEmpty()) {
                MediaScannerConnection.scanFile(
                    reactContext,
                    scannedPaths.toTypedArray(),
                    null,
                    null
                )
            }

            withContext(Dispatchers.Main) {
                val map = Arguments.createMap().apply {
                    putInt("deletedCount", deletedCount)
                    putInt("failedCount", failedCount)
                }
                promise.resolve(map)
            }
        }
    }

    @ReactMethod
    fun deleteFolders(folderPaths: ReadableArray, promise: Promise) {
        moduleScope.launch {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
                withContext(Dispatchers.Main) {
                    promise.reject("PERMISSION_DENIED", "All Files Access permission is required to delete folders permanently.")
                }
                return@launch
            }

            var deletedFilesCount = 0
            val scannedPaths = mutableListOf<String>()

            for (i in 0 until folderPaths.size()) {
                val folderPath = folderPaths.getString(i) ?: continue
                try {
                    val folderDir = File(folderPath)
                    if (folderDir.exists() && folderDir.isDirectory) {
                        val files = folderDir.listFiles()
                        if (files != null) {
                            for (f in files) {
                                val p = f.absolutePath
                                val success = deleteMediaByPathOrId(p)
                                scannedPaths.add(p)
                                if (success) {
                                    deletedFilesCount++
                                }
                            }
                        }
                        folderDir.delete()
                    }
                } catch (_: Exception) {}
            }

            if (scannedPaths.isNotEmpty()) {
                MediaScannerConnection.scanFile(
                    reactContext,
                    scannedPaths.toTypedArray(),
                    null,
                    null
                )
            }

            withContext(Dispatchers.Main) {
                val map = Arguments.createMap().apply {
                    putInt("deletedFilesCount", deletedFilesCount)
                }
                promise.resolve(map)
            }
        }
    }

    @ReactMethod
    fun moveToVault(videos: ReadableArray, promise: Promise) {
        moduleScope.launch {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
                withContext(Dispatchers.Main) {
                    promise.reject("PERMISSION_DENIED", "All Files Access permission is required to move videos to Private Vault.")
                }
                return@launch
            }

            val vaultDir = getVaultDirectory()
            val resultList = Arguments.createArray()
            val scannedPaths = mutableListOf<String>()

            for (i in 0 until videos.size()) {
                val v = videos.getMap(i) ?: continue
                val id = v.getString("id") ?: continue
                val originalPath = v.getString("path") ?: continue
                val filename = v.getString("filename") ?: "video_${System.currentTimeMillis()}.mp4"

                try {
                    val sourceFile = File(originalPath)
                    if (!sourceFile.exists()) continue

                    val ext = sourceFile.extension.ifEmpty { "mp4" }
                    val vaultFilename = "v_${id}_${System.currentTimeMillis()}.$ext"
                    val targetFile = File(vaultDir, vaultFilename)

                    // 1. Instant atomic move into private sandbox vault
                    val moved = sourceFile.renameTo(targetFile)
                    if (!moved) {
                        sourceFile.inputStream().use { input ->
                            targetFile.outputStream().use { output ->
                                input.copyTo(output)
                            }
                        }
                    }

                    // 2. Delete source file completely from public storage & MediaStore
                    deleteMediaByPathOrId(originalPath, id)
                    scannedPaths.add(originalPath)

                    val itemMap = Arguments.createMap().apply {
                        putString("id", id)
                        putString("originalPath", originalPath)
                        putString("originalFolder", v.getString("folder") ?: "Internal")
                        putString("vaultPath", targetFile.absolutePath)
                        putString("filename", filename)
                        putDouble("size", v.getDouble("size"))
                        putDouble("duration", v.getDouble("duration"))
                        putInt("width", v.getInt("width"))
                        putInt("height", v.getInt("height"))
                        putString("mimeType", v.getString("mimeType") ?: "video/*")
                        putDouble("dateAdded", v.getDouble("dateAdded"))
                        putString("thumbnailUri", v.getString("thumbnailUri"))
                        putDouble("dateMoved", System.currentTimeMillis().toDouble())
                    }
                    resultList.pushMap(itemMap)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            if (scannedPaths.isNotEmpty()) {
                MediaScannerConnection.scanFile(
                    reactContext,
                    scannedPaths.toTypedArray(),
                    null,
                    null
                )
            }

            withContext(Dispatchers.Main) {
                promise.resolve(resultList)
            }
        }
    }

    @ReactMethod
    fun restoreFromVault(items: ReadableArray, promise: Promise) {
        moduleScope.launch {
            val restoredList = Arguments.createArray()
            val scannedPaths = mutableListOf<String>()

            for (i in 0 until items.size()) {
                val item = items.getMap(i) ?: continue
                val id = item.getString("id") ?: continue
                val vaultPath = item.getString("vaultPath") ?: continue
                val originalPath = item.getString("originalPath") ?: continue

                try {
                    val vaultFile = File(vaultPath)
                    if (!vaultFile.exists()) continue

                    val targetFile = File(originalPath)
                    targetFile.parentFile?.mkdirs()

                    var restored = vaultFile.renameTo(targetFile)
                    if (!restored) {
                        vaultFile.inputStream().use { input ->
                            targetFile.outputStream().use { output ->
                                input.copyTo(output)
                            }
                        }
                        vaultFile.delete()
                    }

                    scannedPaths.add(targetFile.absolutePath)
                    restoredList.pushString(id)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            if (scannedPaths.isNotEmpty()) {
                MediaScannerConnection.scanFile(
                    reactContext,
                    scannedPaths.toTypedArray(),
                    null,
                    null
                )
            }

            withContext(Dispatchers.Main) {
                promise.resolve(restoredList)
            }
        }
    }

    @ReactMethod
    fun deleteFromVault(vaultPaths: ReadableArray, promise: Promise) {
        moduleScope.launch {
            var count = 0
            for (i in 0 until vaultPaths.size()) {
                val p = vaultPaths.getString(i) ?: continue
                try {
                    val f = File(p)
                    if (f.exists() && f.delete()) {
                        count++
                    }
                } catch (_: Exception) {}
            }
            withContext(Dispatchers.Main) {
                promise.resolve(count)
            }
        }
    }
}
