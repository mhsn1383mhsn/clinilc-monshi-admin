#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const androidApp = path.join(root, 'android', 'app', 'src', 'main');
const res = path.join(androidApp, 'res');
const javaRoot = path.join(androidApp, 'java');

function findFile(dir, namePart) {
  if (!fs.existsSync(dir)) return null;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const f = findFile(p, namePart);
      if (f) return f;
    } else if (ent.name.includes(namePart)) return p;
  }
  return null;
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

async function copyIcons() {
  const src512 = path.join(root, 'icons', 'icon-512.png');
  const src192 = path.join(root, 'icons', 'icon-192.png');
  if (!fs.existsSync(src512)) {
    console.warn('No icons/icon-512.png — skip icon inject');
    return;
  }
  let sharp;
  try { sharp = require('sharp'); } catch (_) { sharp = null; }

  const densities = [
    ['mipmap-mdpi', 48],
    ['mipmap-hdpi', 72],
    ['mipmap-xhdpi', 96],
    ['mipmap-xxhdpi', 144],
    ['mipmap-xxxhdpi', 192],
  ];

  for (const [folder, size] of densities) {
    const dir = path.join(res, folder);
    ensureDir(dir);
    const targets = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'];
    for (const name of targets) {
      const out = path.join(dir, name);
      if (sharp) {
        await sharp(src512).resize(size, size).png().toFile(out);
      } else {
        const src = size <= 96 && fs.existsSync(src192) ? src192 : src512;
        fs.copyFileSync(src, out);
      }
    }
    // remove adaptive xml that overrides png if present
    for (const xml of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      const xp = path.join(dir, xml);
      if (fs.existsSync(xp)) fs.unlinkSync(xp);
    }
    console.log('icon', folder, size);
  }

  // anydpi adaptive icons
  const anyDir = path.join(res, 'mipmap-anydpi-v26');
  if (fs.existsSync(anyDir)) {
    for (const xml of fs.readdirSync(anyDir)) {
      try { fs.unlinkSync(path.join(anyDir, xml)); } catch (_) {}
    }
  }
}

function injectSmsBridge() {
  const mainActivity = findFile(javaRoot, 'MainActivity.java');
  if (!mainActivity) {
    console.warn('MainActivity.java not found');
    return;
  }
  const pkgDir = path.dirname(mainActivity);
  let pkg = 'com.clinic.app';
  const existing = fs.readFileSync(mainActivity, 'utf8');
  const pkgMatch = existing.match(/package\s+([\w.]+);/);
  if (pkgMatch) pkg = pkgMatch[1];

  const bridgeSimple = `package ${pkg};

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.telephony.SmsManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import org.json.JSONArray;
import org.json.JSONObject;

public class AndroidSmsBridge {
  private final Activity activity;
  private WebView webView;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private static final int REQ_SMS = 88421;

  public AndroidSmsBridge(Activity activity) {
    this.activity = activity;
  }

  public void attachWebView(WebView webView) {
    this.webView = webView;
  }

  @JavascriptInterface
  public boolean hasPermission() {
    return ContextCompat.checkSelfPermission(activity, Manifest.permission.SEND_SMS)
        == PackageManager.PERMISSION_GRANTED;
  }

  @JavascriptInterface
  public void requestSmsPermission() {
    handler.post(() -> ActivityCompat.requestPermissions(
      activity,
      new String[]{Manifest.permission.SEND_SMS},
      REQ_SMS
    ));
  }

  @JavascriptInterface
  public void sendSms(String phone, String body) {
    handler.post(() -> {
      try {
        if (!hasPermission()) {
          requestSmsPermission();
          return;
        }
        SmsManager sms = SmsManager.getDefault();
        ArrayList<String> parts = sms.divideMessage(body == null ? "" : body);
        if (parts.size() <= 1) sms.sendTextMessage(phone, null, body, null, null);
        else sms.sendMultipartTextMessage(phone, null, parts, null, null);
      } catch (Exception ignored) {}
    });
  }

  @JavascriptInterface
  public void sendBulkSmsFast(String phonesJson, String body) {
    handler.post(() -> {
      try {
        if (!hasPermission()) {
          requestSmsPermission();
          return;
        }
        JSONArray arr = new JSONArray(phonesJson == null ? "[]" : phonesJson);
        SmsManager sms = SmsManager.getDefault();
        String text = body == null ? "" : body;
        for (int i = 0; i < arr.length(); i++) {
          String phone;
          Object item = arr.get(i);
          if (item instanceof JSONObject) {
            JSONObject o = (JSONObject) item;
            phone = o.optString("phone", o.optString("to", ""));
            text = o.optString("body", o.optString("text", text));
          } else {
            phone = String.valueOf(item);
          }
          if (phone == null || phone.isEmpty() || "null".equals(phone)) continue;
          ArrayList<String> parts = sms.divideMessage(text);
          if (parts.size() <= 1) sms.sendTextMessage(phone, null, text, null, null);
          else sms.sendMultipartTextMessage(phone, null, parts, null, null);
          try { Thread.sleep(400); } catch (InterruptedException ignored) {}
        }
      } catch (Exception ignored) {}
    });
  }
}
`;

  fs.writeFileSync(path.join(pkgDir, 'AndroidSmsBridge.java'), bridgeSimple);

  const mainOut = `package ${pkg};

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerSmsBridge();
  }

  @Override
  public void onStart() {
    super.onStart();
    registerSmsBridge();
  }

  private void registerSmsBridge() {
    try {
      if (getBridge() == null || getBridge().getWebView() == null) return;
      WebView webView = getBridge().getWebView();
      AndroidSmsBridge bridge = new AndroidSmsBridge(this);
      bridge.attachWebView(webView);
      webView.addJavascriptInterface(bridge, "AndroidSms");
      webView.addJavascriptInterface(bridge, "Android");
    } catch (Exception ignored) {}
  }
}
`;
  fs.writeFileSync(mainActivity, mainOut);
  console.log('MainActivity written for AndroidSms');

  const manifestPath = path.join(androidApp, 'AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    let man = fs.readFileSync(manifestPath, 'utf8');
    for (const perm of ['android.permission.SEND_SMS', 'android.permission.READ_PHONE_STATE']) {
      if (!man.includes(perm)) {
        man = man.replace('<application', `<uses-permission android:name="${perm}" />\n    <application`);
      }
    }
    fs.writeFileSync(manifestPath, man);
    console.log('AndroidManifest permissions ok');
  }
}

(async () => {
  await copyIcons();
  injectSmsBridge();
  console.log('setup-android done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
