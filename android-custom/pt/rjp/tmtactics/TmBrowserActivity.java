package pt.rjp.tmtactics;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

/**
 * Browser dedicado apenas ao Trophy Manager. O utilizador inicia sessão diretamente
 * no site oficial (cookies isolados do Edge) e autoriza a importação premindo um botão.
 * Sem JavascriptInterface, sem exportar cookies ou passwords, sem pedidos automáticos.
 */
public class TmBrowserActivity extends Activity {
    private WebView web;
    private TextView pageLabel;
    private final String START = "https://trophymanager.com/players/";
    private boolean allowed(Uri uri) {
        if(uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        String host = uri.getHost();
        return "trophymanager.com".equalsIgnoreCase(host) || "www.trophymanager.com".equalsIgnoreCase(host);
    }
    private int dp(int v){return (int)(getResources().getDisplayMetrics().density*v+.5f);}
    private Button button(String caption){
        Button b=new Button(this);b.setText(caption);b.setTextColor(Color.WHITE);b.setAllCaps(false);
        b.setTextSize(12);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(26,82,65)));
        return b;
    }
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setStatusBarColor(Color.rgb(9,42,36));
        getWindow().setNavigationBarColor(Color.rgb(9,42,36));
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(8,34,29));
        LinearLayout bar=new LinearLayout(this);bar.setOrientation(LinearLayout.HORIZONTAL);bar.setPadding(dp(4),dp(3),dp(4),dp(3));
        Button back=button("‹ Voltar"),players=button("Plantel"),importer=button("✓ Importar"),close=button("Fechar");
        bar.addView(back,new LinearLayout.LayoutParams(0,dp(47),1));
        bar.addView(players,new LinearLayout.LayoutParams(0,dp(47),1));
        bar.addView(importer,new LinearLayout.LayoutParams(0,dp(47),1.3f));
        bar.addView(close,new LinearLayout.LayoutParams(0,dp(47),1));
        pageLabel=new TextView(this);pageLabel.setTextColor(Color.rgb(202,235,213));pageLabel.setTextSize(11);
        pageLabel.setPadding(dp(12),dp(4),dp(12),dp(6));pageLabel.setText("TM — inicia sessão e abre Plantel → Jogadores");
        web=new WebView(this);WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(true);settings.setBuiltInZoomControls(true);settings.setDisplayZoomControls(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){
                if(!req.isForMainFrame())return false;
                Uri uri=req.getUrl();
                if(allowed(uri))return false;
                try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException ignored){}
                return true;
            }
            @Override public void onPageFinished(WebView view,String url){
                pageLabel.setText("TM · "+url.replace("https://", "").replace("www.",""));
            }
        });
        root.addView(bar);root.addView(pageLabel);
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);
        back.setOnClickListener(v->{if(web.canGoBack())web.goBack();else finish();});
        players.setOnClickListener(v->web.loadUrl(START));
        importer.setOnClickListener(v->importNow());
        close.setOnClickListener(v->finish());
        web.loadUrl(START);
    }
    private void importNow(){
        String u=web.getUrl();
        if(u==null||!allowed(Uri.parse(u))||!Uri.parse(u).getPath().startsWith("/players")){
            Toast.makeText(this,"Abre primeiro Plantel → Jogadores dentro do TM.",Toast.LENGTH_LONG).show();return;
        }
        // Executado APENAS no separador TM, depois de o utilizador clicar no botão.
        String js="(function(){try{var a=(typeof players_ar!=='undefined'?players_ar:window.players_ar);"+
          "if(!Array.isArray(a)||!a.length)return JSON.stringify({error:'Jogadores não disponíveis nesta página. Abre a lista do plantel.'});"+
          "var s=(typeof SESSION!=='undefined'?SESSION:window.SESSION)||{};"+
          "return JSON.stringify({players:a,club:s.clubname||''});"+
          "}catch(e){return JSON.stringify({error:String(e.message||e)});}})()";
        web.evaluateJavascript(js,value->{
            try{
                Object decoded=new JSONTokener(value).nextValue();
                if(!(decoded instanceof String))throw new Exception("Resposta inesperada do TM.");
                JSONObject payload=new JSONObject((String)decoded);
                if(payload.has("error"))throw new Exception(payload.optString("error"));
                JSONArray players=payload.getJSONArray("players");
                if(players.length()==0)throw new Exception("Não foram encontrados jogadores.");
                if(payload.toString().length()>2_000_000)throw new Exception("Plantel demasiado grande para importar.");
                getSharedPreferences(TMBridgePlugin.STORE,MODE_PRIVATE).edit().putString(TMBridgePlugin.PENDING,payload.toString()).apply();
                Toast.makeText(this,players.length()+" jogadores recolhidos!",Toast.LENGTH_SHORT).show();
                finish();
            }catch(Exception ex){new AlertDialog.Builder(this).setTitle("Importação TM").setMessage(ex.getMessage()).setPositiveButton("OK",null).show();}
        });
    }
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){
        if(web!=null){web.stopLoading();web.destroy();web=null;}
        super.onDestroy();
    }
}
