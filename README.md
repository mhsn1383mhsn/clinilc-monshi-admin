# پنل مدیریت کلینیک

برنامهٔ PWA مستقل برای مدیریت کلینیک.

## اجرا

```bash
npx serve .
# یا
python3 -m http.server 8080
```

## انتشار GitHub Pages

Settings → Pages → Deploy from branch `main` / root

## بیلد APK با GitHub Actions (PWA Builder / Bubblewrap)

این مخزن فقط فایل‌های وب را دارد. برای APK می‌توانید از [PWA Builder](https://www.pwabuilder.com/) استفاده کنید یا workflow زیر را اضافه کنید.

### ساختار

```
├── index.html
├── manifest.webmanifest
├── sw.js
└── icons/
    ├── icon-180.png
    ├── icon-192.png
    ├── icon-512.png
    └── icon-512-maskable.png
```
