package com.admh.directwhatsapp;

import android.app.LocaleManager;
import android.os.Build;
import android.os.LocaleList;

import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.os.LocaleListCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Mirrors the app's in-app language (ar/en/ckb/fa) to Android's per-app locale.
 * That lets the launcher use the localized app label while the icon stays the
 * same. Android 13+ uses LocaleManager; older versions use AppCompat.
 */
@CapacitorPlugin(name = "AppLocale")
public class AppLocalePlugin extends Plugin {
    @PluginMethod
    public void setLocale(PluginCall call) {
        String locale = call.getString("locale", "ar");
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                LocaleManager manager = getContext().getSystemService(LocaleManager.class);
                if (manager != null) {
                    manager.setApplicationLocales(LocaleList.forLanguageTags(locale));
                }
            } else {
                AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(locale));
            }
            call.resolve();
        } catch (Exception error) {
            call.reject(error.getMessage());
        }
    }
}
