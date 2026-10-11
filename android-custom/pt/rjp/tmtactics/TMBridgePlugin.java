package pt.rjp.tmtactics;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "TMBridge")
public class TMBridgePlugin extends Plugin {
    static final String STORE = "RJP_TM_TACTICS_PRIVATE";
    static final String PENDING = "pending_roster";
    static final String PENDING_PREVIEW = "pending_preview";
    static final String PENDING_RIVAL = "pending_rival";

    @PluginMethod public void openBrowser(PluginCall call) {
        try {
            Intent intent = new Intent(getActivity(), TmBrowserActivity.class);
            intent.putExtra("start_page",call.getString("page","players"));
            getActivity().startActivity(intent);
            call.resolve();
        } catch(Exception e) { call.reject("Falha ao abrir o navegador TM", e); }
    }

    @PluginMethod public void consumePreview(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(STORE, Context.MODE_PRIVATE);
        String payload = prefs.getString(PENDING_PREVIEW, null);
        JSObject ret = new JSObject();
        if (payload != null) {
            prefs.edit().remove(PENDING_PREVIEW).apply();
            ret.put("json", payload);
        }
        call.resolve(ret);
    }

    @PluginMethod public void consumeRival(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(STORE, Context.MODE_PRIVATE);
        String payload = prefs.getString(PENDING_RIVAL, null);
        JSObject ret = new JSObject();
        if (payload != null) {
            prefs.edit().remove(PENDING_RIVAL).apply();
            ret.put("json", payload);
        }
        call.resolve(ret);
    }

    @PluginMethod public void consumeImport(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(STORE, Context.MODE_PRIVATE);
        String payload = prefs.getString(PENDING, null);
        JSObject ret = new JSObject();
        if (payload != null) {
            // A importação é consumida apenas uma vez; sem cache na nuvem.
            prefs.edit().remove(PENDING).apply();
            ret.put("json", payload);
        }
        call.resolve(ret);
    }
}
