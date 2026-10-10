package pt.rjp.tmtactics;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TMBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
