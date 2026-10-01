# انتقال از نسخهٔ قبلی

نسخهٔ ۲ جایگزین نسخهٔ قبلی است؛ کپی فایل‌های جدید بدون حذف فایل‌های قدیمی کافی نیست. قبل از انتقال، تغییرات شخصی‌تان را commit کنید.

## روش پیشنهادی: patch کامل

فایل `TwinSight-redesign.patch` کنار ZIP تحویل شده است. این patch نسبت به commit بررسی‌شده ساخته شده و اضافه‌شدن، حذف و جابه‌جایی تمام فایل‌ها را پوشش می‌دهد؛ فونت هم داخل آن است.

از ریشهٔ checkout خود، مسیر فایل دانلودشده را جایگزین کنید:

```bash
git apply --check /path/to/TwinSight-redesign.patch
git apply /path/to/TwinSight-redesign.patch
npm run build
npm run dev
```

اگر `--check` به علت تفاوت نسخهٔ ریپازیتوری خطا داد، patch را اجباری اعمال نکنید؛ از پوشهٔ کامل استفاده کنید و تغییرات شخصی را ادغام کنید.

## روش پوشهٔ کامل

داخل ZIP یک پوشهٔ `TwinSight/` با تمام سورس‌های نسخهٔ جدید و یک `dist/` آمادهٔ استقرار وجود دارد. برای جایگزینی دستی:

1. در checkout فعلی پوشه‌های قدیمی `src/`، `tests/`، `tools/` و فایل‌های قدیمی `.env.example`، `SHA256SUMS.txt`، `UI-UPDATE.md`، `start-demo.sh` و `start-demo.cmd` را حذف کنید.
2. محتویات قدیمی `docs/` و `.github/workflows/checks.yml` را با فایل‌های جدید جایگزین کنید.
3. فایل‌ها و پوشه‌های داخل `TwinSight/` بسته را در ریشهٔ checkout کپی کنید. `.github/` و `.gitignore` هم باید کپی شوند؛ در Finder ممکن است پنهان باشند. پوشهٔ `.git` خودتان را حفظ کنید.
4. اگر از نسخهٔ قبلی `node_modules/` یا `package-lock.json` ساخته‌اید، آن‌ها دیگر لازم نیستند. نسخهٔ جدید وابستگی npm ندارد.

سپس فایل‌های تغییرکرده و حذف‌شده را همراه هم ثبت کنید:

```bash
git status --short
git add -A
git commit -m "Redesign TwinSight as a static Persian demo"
git push origin main
```

برای انتشار خودکار، یک بار Settings → Pages → Source را روی GitHub Actions بگذارید. این بسته هیچ پوش یا استقرار عمومی انجام نداده است.
