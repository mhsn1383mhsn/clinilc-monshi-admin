# پنل مدیریت کلینیک

برنامهٔ مستقل مدیریت کلینیک (PWA + بیلد APK در GitHub).

## بیلد APK در GitHub

1. این پوشه را به‌عنوان مخزن جدا push کنید.
2. تب **Actions** → workflow **Build APK** → **Run workflow**
3. بعد از اتمام، از **Artifacts** فایل `app-debug-apk` را دانلود کنید.

## ساختار

```
├── index.html
├── manifest.webmanifest
├── sw.js
├── icons/
├── package.json
├── capacitor.config.json
└── .github/workflows/build-apk.yml
```
