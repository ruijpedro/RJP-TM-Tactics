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

    @PluginMethod public void openBrowser(PluginCall call) {
        try {
            Intent intent = new Intent(getActivity(), TmBrowserActivity.class);
            getActivity().startActivity(intent);
            call.resolve();
        } catch(Exception e) { call.reject("Falha ao abrir o navegador TM", e); }
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
