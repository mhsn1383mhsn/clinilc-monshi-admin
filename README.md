# مدیریت کلینیک

برنامهٔ PWA / اندروید مستقل.

## بیلد APK در GitHub

1. این پوشه را به‌عنوان یک مخزن جدا روی GitHub پوش کنید.
2. بروید به تب **Actions**
3. workflow به نام **Build APK** را باز کنید و **Run workflow** بزنید.
4. بعد از اتمام، از بخش **Artifacts** فایل `app-debug-apk` را دانلود کنید.

هر push روی `main` هم به‌صورت خودکار APK می‌سازد.

## اجرای وب

```bash
npx serve .
```

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
