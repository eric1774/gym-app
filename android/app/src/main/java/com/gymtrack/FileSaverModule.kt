package com.gymtrack

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FileSaverModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "FileSaver"
        private const val CREATE_FILE_REQUEST = 48_001
    }

    private var pendingPromise: Promise? = null
    private var pendingContent: String? = null

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?,
        ) {
            if (requestCode != CREATE_FILE_REQUEST) return

            val promise = pendingPromise ?: return
            val content = pendingContent

            pendingPromise = null
            pendingContent = null

            if (resultCode != Activity.RESULT_OK || data?.data == null) {
                promise.resolve(false) // user cancelled — not an error
                return
            }

            try {
                val uri = data.data!!
                reactApplicationContext.contentResolver.openOutputStream(uri)?.use { stream ->
                    stream.write(content?.toByteArray(Charsets.UTF_8) ?: ByteArray(0))
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("WRITE_ERROR", "Failed to write file: ${e.message}", e)
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun saveFile(content: String, suggestedName: String, mimeType: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        pendingPromise = promise
        pendingContent = content

        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = mimeType
            putExtra(Intent.EXTRA_TITLE, suggestedName)
        }

        activity.startActivityForResult(intent, CREATE_FILE_REQUEST)
    }
}
