# استقرار ساده

سایت کاملاً استاتیک است. هیچ سرور .NET/Node، دیتابیس، LLM یا secret برای میزبانی لازم نیست. برای این نمونه، زیردامنهٔ رایگان کافی است؛ دامنهٔ اختصاصی نخرید مگر اینکه خودتان بخواهید.

## GitHub Pages

انتخاب اصلی برای همین ریپازیتوری. یک بار Settings → Pages → Build and deployment → Source را روی GitHub Actions قرار دهید. workflow با پوش روی main، build و deploy را اجرا می‌کند. در Pull Request فقط build می‌شود. وضعیت را در Actions ببینید؛ خروجی artifact به نام `twinsight-static` نیز برای دانلود موجود است.

آدرس مورد انتظار بعد از انتشار موفق: `https://iamalijafari.github.io/TwinSight/`. هنوز سایتی از این بسته منتشر نشده است. Pages برای ریپازیتوری عمومی با GitHub Free در دسترس است؛ وضعیت ریپازیتوری خصوصی به پلن حساب بستگی دارد.

منبع: [راهنمای رسمی workflowهای Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Netlify؛ جایگزین برای تحویل سریع پوشه

پلن Free در زمان بررسی موجود است و محدودیت مصرف دارد. ZIP را باز کنید و پوشهٔ `dist/` را در رابط Deploy دستی قرار دهید. فایل `index.html` باید داخل همان پوشه باشد. در deploy دستی build اجرا نمی‌شود، پس باید خروجی آماده را آپلود کنید. Netlify یک آدرس میزبانی به سایت می‌دهد.

اگر ریپو را در Netlify به Git متصل کنید، فایل `netlify.toml` شامل `npm run build` و پوشهٔ خروجی `dist` است؛ پوش‌ها توسط خود Netlify build و deploy می‌شوند. GitHub workflow مخصوص Pages است و جایگزین تنظیمات اتصال Netlify نیست.

منابع: [Free و سایر پلن‌ها](https://www.netlify.com/pricing/) و [استقرار با Drag and Drop](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/). اتصال حساب یا استقرار عمومی در این تحویل انجام نشده است.

## میزبان استاتیک دیگر

`npm run build` را اجرا کنید و فایل‌های **داخل** `dist/` را در ریشهٔ پوشهٔ عمومی میزبان قرار دهید. مسیرها نسبی‌اند؛ مسیرهای صفحه‌ها با hash مثل `#report` مشخص می‌شوند، بنابراین redirect یا rewrite سمت سرور لازم نیست. MIME مربوط به JS باید JavaScript و فونت WOFF2 باید font/woff2 باشد؛ بیشتر میزبان‌های استاتیک این را خودکار تنظیم می‌کنند.

برای اجرای محلی خروجی ساخته‌شده: `npm run preview`. برای ارائهٔ بدون اینترنت: فایل‌ها را از قبل دانلود کنید، سرور محلی را اجرا کنید و مرورگر را باز کنید.
