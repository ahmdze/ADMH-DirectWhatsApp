package com.admh.directwhatsapp;

import android.content.ContentResolver;
import android.content.Intent;
import android.net.Uri;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.UUID;

/**
 * Receives Android ACTION_SEND intents (text and files) and exposes them to the
 * web layer through a tiny Capacitor plugin. Files are copied into the app cache
 * under shared/; the JS side reads them with Filesystem and attaches them to a
 * draft. Nothing is persisted beyond the current session.
 */
@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {
    private static ShareTargetPlugin instance;
    private static Intent pendingIntent;
    private static JSObject pendingPayload;

    @Override
    public void load() {
        instance = this;
        if (pendingIntent != null) {
            dispatch(pendingIntent);
            pendingIntent = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
    }

    /** Called by MainActivity from onCreate/onNewIntent. */
    public static void setIntent(Intent intent) {
        if (intent == null) return;
        if (instance == null) {
            pendingIntent = intent;
            return;
        }
        JSObject payload = instance.dispatch(intent);
        if (payload != null) {
            instance.notifyListeners("shareReceived", payload, true);
        }
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        if (pendingPayload == null) {
            call.resolve();
            return;
        }
        JSObject payload = pendingPayload;
        pendingPayload = null;
        call.resolve(payload);
    }

    private synchronized JSObject dispatch(Intent intent) {
        try {
            String action = intent.getAction();
            if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
                return null;
            }

            JSObject payload = new JSObject();
            payload.put("id", UUID.randomUUID().toString());
            payload.put("text", nonNull(intent.getStringExtra(Intent.EXTRA_TEXT)));
            payload.put("subject", nonNull(intent.getStringExtra(Intent.EXTRA_SUBJECT)));
            String mime = nonNull(intent.getType());
            payload.put("mimeType", mime);

            JSArray files = new JSArray();
            if (Intent.ACTION_SEND.equals(action)) {
                Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (uri != null) {
                    String name = copyToCache(uri, mime);
                    if (name != null) files.put(name);
                }
            } else {
                ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (uris != null) {
                    for (Uri uri : uris) {
                        String name = copyToCache(uri, mime);
                        if (name != null) files.put(name);
                    }
                }
            }
            payload.put("files", files);
            pendingPayload = payload;
            return payload;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String copyToCache(Uri uri, String mime) {
        try {
            String extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
            if (extension == null || extension.isEmpty()) extension = "bin";
            File dir = new File(getContext().getCacheDir(), "shared");
            if (!dir.exists() && !dir.mkdirs()) return null;
            File target = File.createTempFile("share-", "." + extension, dir);
            ContentResolver resolver = getContext().getContentResolver();
            try (InputStream input = resolver.openInputStream(uri);
                 FileOutputStream output = new FileOutputStream(target)) {
                if (input == null) return null;
                byte[] buffer = new byte[8192];
                int read;
                while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            }
            return target.getName();
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String nonNull(String value) {
        return value == null ? "" : value;
    }
}
