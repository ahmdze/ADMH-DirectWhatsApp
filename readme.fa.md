<div align="center">

<img src="public/icons/icon-192.png" width="96" alt="لوگوی واتساپ مستقیم" />

# واتساپ مستقیم
### گفت‌وگوی واتساپ، بدون ذخیره شماره

شماره یا نام کاربری یا پیوند — گفت‌وگو را در چند ثانیه باز کنید، و مقصدها، پیام‌ها و ابزارهایتان را روی دستگاه خود نگه دارید.

[**نسخه وب را استفاده کنید**](https://ahmdze.github.io/ADMH-DirectWhatsApp/)　·　[**برنامه اندروید را دانلود کنید**](https://github.com/ahmdze/ADMH-DirectWhatsApp/releases/latest)　·　[پروژه را کاوش کنید](#برای-توسعه-دهندگان)

<br />

<a href="https://github.com/ahmdze/ADMH-DirectWhatsApp/releases/tag/v2.4.3"><img src="docs/badges/version-2.4.3.svg" height="28" alt="نسخه 2.4.3" /></a>
&nbsp; <img src="docs/badges/platform.svg" height="28" alt="PWA و Android APK" />
&nbsp; <img src="docs/badges/app-langs.svg" height="28" alt="چهار زبان" />

<p>زبان: <a href="https://ahmdze.github.io/ADMH-DirectWhatsApp/guide/?lang=ar">العربية</a> · <a href="https://ahmdze.github.io/ADMH-DirectWhatsApp/guide/?lang=en">English</a> · <a href="https://ahmdze.github.io/ADMH-DirectWhatsApp/guide/?lang=ckb">کوردی</a> · <strong>فارسی</strong></p>

</div>

---

> **حریم خصوصی شما اولویت دارد:** هیچ حساب و هیچ سروری برای برنامه وجود ندارد. داده‌های شما به‌صورت محلی ذخیره می‌شود، و برنامه پیام‌ها را به‌صورت خودکار ارسال نمی‌کند؛ خودتان گفت‌وگو را بررسی و ارسال می‌کنید.

## یک نگاه سریع

**💬 گفت‌وگویی باز کنید**　شماره محلی یا بین‌المللی، `@نام کاربری`، یا پیوند واتساپ.  
**📇 مخاطبین خود را سازماندهی کنید**　مقصدها، قالب‌ها و تاریخچه گفت‌وگوها در فضاهای کاری جداگانه.  
**🔳 بسازید و به اشتراک بگذارید**　کدهای QR، کارت‌های مخاطب، برچسب‌ها، و پیوست‌های جلسه.

## برنامه را ببینید

<p align="center">
<a href="docs/screenshots/compose-dark.png"><img src="docs/screenshots/compose-dark.png" width="190" alt="صفحه ارسال در حالت تیره" /></a>
<a href="docs/screenshots/targets-dark.png"><img src="docs/screenshots/targets-dark.png" width="190" alt="فهرست مقصدها" /></a>
<a href="docs/screenshots/qr-dark.png"><img src="docs/screenshots/qr-dark.png" width="190" alt="ابزار کد QR" /></a>
</p>

<p align="center"><sub>ارسال　·　مقصدها　·　ابزارهای QR</sub></p>

<details>
<summary>تصاویر بیشتر ببینید — حالت روشن، زبان‌ها، یادآورها، و انتقال داده</summary>

<p align="center">
<a href="docs/screenshots/compose-light.png"><img src="docs/screenshots/compose-light.png" width="170" alt="صفحه ارسال در حالت روشن" /></a>
<a href="docs/screenshots/settings-dark.png"><img src="docs/screenshots/settings-dark.png" width="170" alt="تنظیمات" /></a>
<a href="docs/screenshots/reminders-v24-ar.png"><img src="docs/screenshots/reminders-v24-ar.png" width="170" alt="یادآورها به عربی" /></a>
</p>
<p align="center"><sub>حالت روشن　·　تنظیمات　·　یادآورها</sub></p>

<p align="center">
<a href="docs/screenshots/compose-kurdish.png"><img src="docs/screenshots/compose-kurdish.png" width="170" alt="رابط کردی" /></a>
<a href="docs/screenshots/compose-persian.png"><img src="docs/screenshots/compose-persian.png" width="170" alt="رابط فارسی" /></a>
<a href="docs/screenshots/transfer-v23.png"><img src="docs/screenshots/transfer-v23.png" width="170" alt="انتقال داده" /></a>
</p>
<p align="center"><sub>کردی　·　فارسی　·　انتقال داده</sub></p>

> تصاویر از نسخه توسعه با داده‌های آزمایشی (`?demo=1`) تولید شده‌اند.

</details>

## برای استفاده روزمره طراحی شده

### بنویسید و باز کنید

- قالب‌بندی خودکار شماره‌ها با انتخاب و تشخیص کشور.
- یک پیام اختیاری بنویسید، از یک قالب استفاده کنید، سپس پیش‌نمایش را پیش از باز کردن واتساپ بررسی کنید.
- گفت‌وگو را باز کنید یا پیوندش را کپی کنید یا از دستگاه خود به اشتراک بگذارید.

### ذخیره و سازماندهی کنید

- مقصدها را با نام، برچسب، یادداشت و علاقه‌مندی‌ها نگه دارید.
- قالب‌هایی با پیام‌های قابل‌تخصیص و متغیرهایی مانند `{الاسم}` و `{التاريخ}` بسازید.
- داده‌های کاری را از استفاده شخصی از طریق فضاهای کاری جدا کنید.

### ابزارهای کاربردی

- کدهای QR بسازید و با دوربین یا از تصویر بخوانید.
- کارت اشتراک‌گذاری یا vCard و برچسب‌های QR برای چاپ روی A4 طراحی کنید.
- یادآورهای پیگیری بسازید، و داده‌هایتان را منتقل کنید یا نسخه پشتیبان بگیرید.

### به زبان و دستگاه شما کار می‌کند

عربی، English، کوردی (سورانی)، فارسی — با جهت و فونت مناسب هر زبان. آن را به‌عنوان برنامه وب پیشرو (PWA) استفاده کنید، یا APK را روی اندروید نصب کنید.

## وب یا اندروید؟

### 🌐 نسخه وب (PWA)

- [برنامه را باز کنید](https://ahmdze.github.io/ADMH-DirectWhatsApp/) و اگر خواستید از منوی مرورگر نصبش کنید.
- پس از اولین بارگذاری، رابط و داده‌های محلی بدون اتصال در دسترس هستند.
- یادآورها هنگام باز شدن برنامه نمایش داده می‌شوند، بسته به پشتیبانی مرورگر.
- داده‌ها در IndexedDB در پروفایل مرورگر ذخیره می‌شوند.
- برنامه پیش از اعمال به‌روزرسانی PWA موافقت شما را می‌خواهد.

### 🤖 برنامه اندروید (APK)

- [آخرین نسخه را دانلود کنید](https://github.com/ahmdze/ADMH-DirectWhatsApp/releases/latest) و مستقیماً نصبش کنید.
- رابط و داده‌های برنامه محلی هستند؛ برای تکمیل گفت‌وگو در واتساپ به اینترنت نیاز است.
- از اعلان‌های محلی زمان‌بندی‌شده پشتیبانی می‌کند، حتی وقتی برنامه بسته است.
- داده‌هایش از PWA جدا هستند؛ برای انتقال آن‌ها از پشتیبان یا ابزار انتقال استفاده کنید.
- به‌روزرسانی را دستی بررسی کنید؛ دانلود یا نصب فقط با موافقت شما شروع می‌شود.

## حریم خصوصی و داده‌ها

- هیچ حساب، هیچ سرور برنامه و هیچ ابزار تحلیلی داخلی وجود ندارد؛ داده‌های شما روی دستگاهتان می‌ماند.
- پیام‌ها به‌صورت خودکار ارسال نمی‌شوند. برنامه یک مقصد واتساپ را باز می‌کند تا خودتان ارسال را کامل کنید.
- دوربین فقط با اجازه صریح کار می‌کند، و هنگام خروج از صفحه اسکن متوقف می‌شود.
- هنگام بررسی به‌روزرسانی اندروید، برنامه با GitHub Releases ارتباط برقرار می‌کند. APK را فقط پس از موافقت شما دانلود می‌کند.
- تصاویر یا شماره‌ها به سرویس QR خارجی ارسال نمی‌شوند.
- ذخیره‌سازی PWA و ذخیره‌سازی اندروید جدا هستند. برای جابه‌جایی بین آن‌ها از پشتیبان یا انتقال داده استفاده کنید.

<details>
<summary>همه ویژگی‌ها با جزئیات</summary>

### پایه و ارسال

> نشان نسخه در ابتدای هر ویژگی نمایش داده می‌شود تا مرور بصری آسان شود و زمان افزوده شدن مشخص باشد.

- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;ورود شماره محلی/بین‌المللی، یا `@نام کاربری`، یا پیوند واتساپ، با قالب‌بندی خودکار و تشخیص کشور.
- <img src="docs/badges/v2.1.0.svg" alt="نسخه v2.1.0" height="18" align="absmiddle" />&nbsp;تکمیل خودکار مقصدهای ذخیره‌شده هنگام تایپ.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;انتخابگر کشور عربی (بیش از 60 کشور) با جستجو، و کشور پیش‌فرض قابل ذخیره.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;پیام اختیاری با شمارنده نویسه (2000 نویسه)، و قالب‌های سریع.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;باز کردن گفت‌وگو، کپی پیوند، و اشتراک‌گذاری از طریق Web Share API.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;تاریخچه هوشمند آخرین گفت‌وگوها، و مقصدهای ذخیره‌شده با نام، برچسب، یادداشت و علاقه‌مندی‌ها.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;قالب‌های پیام قابل ساخت و ویرایش، با متغیرهای `{الاسم}` `{الجهة}` `{التاريخ}`.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;تولید QR (PNG/SVG) و خواندن QR با دوربین یا از تصویر (با جایگزین jsQR).
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;کارت اشتراک‌گذاری PNG با کیفیت بالا، و کارت مخاطب vCard.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;ظاهر تیره/روشن/خودکار + انتخاب رنگ تأکیدی.
- <img src="docs/badges/v2.1.0.svg" alt="نسخه v2.1.0" height="18" align="absmiddle" />&nbsp;تور معرفی در اولین اجرا و صفحه «چه چیز جدید است» پس از هر به‌روزرسانی.
- <img src="docs/badges/v2.2.0.svg" alt="نسخه v2.2.0" height="18" align="absmiddle" />&nbsp;چهار زبان: عربی (پیش‌فرض)، English، کوردی، فارسی — با بارگذاری فرهنگ لغت کردی/فارسی فقط در صورت نیاز.
- <img src="docs/badges/v2.2.0.svg" alt="نسخه v2.2.0" height="18" align="absmiddle" />&nbsp;فونت خودکار مناسب هر زبان: Cairo برای عربی، Vazirmatn برای فارسی، Noto Naskh برای کردی، با امکان تنظیم دستی فونت.
- <img src="docs/badges/v2.3.3.svg" alt="نسخه v2.3.3" height="18" align="absmiddle" />&nbsp;چسباندن هوشمند از کلیپ‌بورد بومی در اندروید، و استخراج شماره از متن چسبانده‌شده.
- <img src="docs/badges/v2.3.4.svg" alt="نسخه v2.3.4" height="18" align="absmiddle" />&nbsp;دکمه «اشتراک‌گذاری برنامه» با دو گزینه: اشتراک‌گذاری اپلیکیشن PWA یا لینک دانلود APK.
- <img src="docs/badges/v2.4.0.svg" alt="نسخه v2.4.0" height="18" align="absmiddle" />&nbsp;**پیوست‌های جلسه محلی**: تصاویر و فایل‌ها و vCard از طریق پنجره اشتراک‌گذاری سیستم به اشتراک گذاشته می‌شوند و در برنامه ذخیره نمی‌شوند، با فشرده‌سازی تصویر WebP و گزینه دانلود جایگزین.
- <img src="docs/badges/v2.4.0.svg" alt="نسخه v2.4.0" height="18" align="absmiddle" />&nbsp;**پیش‌نمایش پیش از ارسال** با حال‌وهوای واتساپ، و کارت اشتراک‌گذاری، و برچسب QR — همه به‌صورت محلی و بدون واکشی پیوندها.
- <img src="docs/badges/v2.4.0.svg" alt="نسخه v2.4.0" height="18" align="absmiddle" />&nbsp;**زمان‌بندی سریع** (Quick Schedule) برای یادآور از Compose با مقصد و پیام فعلی.

### تجربه موبایل (PWA)

- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;نوار پیمایش پایین، برگه‌های پایین، انیمیشن‌های سبک، لرزش، و حالت‌های خالی/بارگذاری/خطای طراحی‌شده.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;نصب PWA، کار کامل بدون اتصال، و به‌روزرسانی با تأیید کاربر.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;Share Target برای دریافت متن/پیوند از برنامه دیگر.
- <img src="docs/badges/v2.1.0.svg" alt="نسخه v2.1.0" height="18" align="absmiddle" />&nbsp;دریافت **تصویر QR اشتراک‌گذاری‌شده** از برنامه دیگر و اسکن خودکار آن (اندروید).
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;میانبرهای آیکون برنامه: «ارسال سریع» و «اسکن QR».
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;قفل اختیاری با PIN یا اثر انگشت (WebAuthn).
- <img src="docs/badges/v2.1.0.svg" alt="نسخه v2.1.0" height="18" align="absmiddle" />&nbsp;اثر انگشت به عنوان روش اصلی باز کردن و PIN به عنوان جایگزین.
- <img src="docs/badges/v2.1.0.svg" alt="نسخه v2.1.0" height="18" align="absmiddle" />&nbsp;اعلان‌های محلی برای یادآورهای پیگیری هنگام باز شدن برنامه.
- <img src="docs/badges/v2.1.0.svg" alt="نسخه v2.1.0" height="18" align="absmiddle" />&nbsp;بنر نصب هوشمندتر (فقط روی موبایل نمایش داده می‌شود، با تأخیر، و پس از نصب پنهان می‌شود).
- <img src="docs/badges/v2.1.0.svg" alt="نسخه v2.1.0" height="18" align="absmiddle" />&nbsp;صفحه‌های پیش‌نمایش در manifest و `handle_links`/`launch_handler` برای باز کردن پیوندها داخل برنامه نصب‌شده.
- <img src="docs/badges/v2.1.0.svg" alt="نسخه v2.1.0" height="18" align="absmiddle" />&nbsp;صفحه خطای شیک با گزینه تعمیر نسخه برنامه.
- <img src="docs/badges/v2.1.0.svg" alt="نسخه v2.1.0" height="18" align="absmiddle" />&nbsp;درخواست ذخیره‌سازی دائمی و هشدار هنگام نزدیک شدن به کمبود فضا.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;پشتیبان‌گیری/بازیابی JSON، و خروجی CSV.
- <img src="docs/badges/v2.3.0.svg" alt="نسخه v2.3.0" height="18" align="absmiddle" />&nbsp;انتقال داده بین دو دستگاه از طریق فایل یا QR، بررسی و تعمیر داده‌ها، و عیب‌یابی دستگاه.
- <img src="docs/badges/v2.4.0.svg" alt="نسخه v2.4.0" height="18" align="absmiddle" />&nbsp;دکمه **«بررسی به‌روزرسانی»** فقط به‌صورت دستی در تنظیمات: هیچ بررسی خودکار در پس‌زمینه وجود ندارد، برای حفظ حریم خصوصی و کاهش درخواست‌ها.
- <img src="docs/badges/v2.4.0.svg" alt="نسخه v2.4.0" height="18" align="absmiddle" />&nbsp;**دکمه یادآورها** در نوار پیمایش پایین برای دسترسی با یک لمس.

### ابزارها و داده ها

- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;برچسب‌های QR برای چاپ روی A4 (شبکه 2×4 یا 3×8) — مناسب مغازه‌ها و رستوران‌ها.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;آمار محلی (7 روز اخیر، پرکاربردترین‌ها).
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;فضاهای کاری (شخصی/کاری) با تفکیک کامل داده‌ها.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;کمپین‌های فهرست شماره‌ها: باز کردن گفت‌وگوها به ترتیب با پیگیری دستی «ارسال شد/رد شد» — **بدون ارسال خودکار**.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;یادآورهای پیگیری که هنگام باز شدن برنامه نمایش داده می‌شوند.
- <img src="docs/badges/v2.4.0.svg" alt="نسخه v2.4.0" height="18" align="absmiddle" />&nbsp;**یادآورهای تکرارشونده** (روزانه/هفتگی/ماهانه) با اعلان‌های محلی و زمان‌بندی در اندروید، و باز شدن Compose از اعلان.
- <img src="docs/badges/v2.4.0.svg" alt="نسخه v2.4.0" height="18" align="absmiddle" />&nbsp;**نسخه پشتیبان خودکار پیش از ارتقا**، قابل دانلود از تنظیمات.
- <img src="docs/badges/v2.0.0.svg" alt="نسخه v2.0.0" height="18" align="absmiddle" />&nbsp;وارد کردن مخاطبین از CSV/vCard یا Contact Picker.
- <img src="docs/badges/v2.3.0.svg" alt="نسخه v2.3.0" height="18" align="absmiddle" />&nbsp;**انتقال داده** بین دو دستگاه از طریق فایل یا کد QR، بدون سرور.
- <img src="docs/badges/v2.3.0.svg" alt="نسخه v2.3.0" height="18" align="absmiddle" />&nbsp;**بررسی و تعمیر داده‌های محلی** (تکرارها، شماره‌های معیوب، رکوردهای یتیم) با پیش‌نمایش پیش از تعمیر.
- <img src="docs/badges/v2.4.0.svg" alt="نسخه v2.4.0" height="18" align="absmiddle" />&nbsp;**پاک‌سازی خودکار تاریخچه و سطل زباله**: تاریخچه گفت‌وگوهای قدیمی به‌صورت خودکار پاک می‌شود، و سطل زباله امکان بازیابی موارد حذف‌شده تا 30 روز را فراهم می‌کند.
- <img src="docs/badges/v2.3.0.svg" alt="نسخه v2.3.0" height="18" align="absmiddle" />&nbsp;**عیب‌یابی دستگاه** (قابلیت‌های مرورگر/دوربین/اعلان‌ها/ذخیره‌سازی) و خروجی گزارش، همراه با [ماتریس تست دستگاه‌ها](docs/DEVICE-TEST-MATRIX.md).
- <img src="docs/badges/v2.3.3.svg" alt="نسخه v2.3.3" height="18" align="absmiddle" />&nbsp;**ارسال به توسعه‌دهنده** از عیب‌یابی: واتساپ را با گزارش کامل باز می‌کند.
- <img src="docs/badges/v2.3.0.svg" alt="نسخه v2.3.0" height="18" align="absmiddle" />&nbsp;**برنامه بومی اندروید (APK)** که در کنار PWA کار می‌کند، با اعلان‌های زمان‌بندی‌شده در پس‌زمینه و نشان/آیکون بومی.
- <img src="docs/badges/v2.3.2.svg" alt="نسخه v2.3.2" height="18" align="absmiddle" />&nbsp;**قفل اثر انگشت بومی** در اندروید، با PIN به‌عنوان جایگزین همیشگی.
- <img src="docs/badges/v2.3.3.svg" alt="نسخه v2.3.3" height="18" align="absmiddle" />&nbsp;**بررسی‌کننده به‌روزرسانی APK** داخل برنامه، با دانلود داخلی و نوار پیشرفت و سپس دکمه نصب.
- <img src="docs/badges/v2.4.3.svg" alt="نسخه v2.4.3" height="18" align="absmiddle" />&nbsp;**Share Target بومی در APK** برای دریافت متن یا پیوند یا تصویر مستقیماً از پنجره اشتراک‌گذاری اندروید.
- <img src="docs/badges/v2.4.3.svg" alt="نسخه v2.4.3" height="18" align="absmiddle" />&nbsp;**میانبرهای آیکون برنامه**: «ارسال سریع»، «اسکن QR»، و «یادآورها».
- <img src="docs/badges/v2.4.3.svg" alt="نسخه v2.4.3" height="18" align="absmiddle" />&nbsp;**نام برنامه در صفحه Android** با زبان داخل برنامه تغییر می‌کند (آیکون ثابت می‌ماند).

---

</details>

## برای توسعه دهندگان

### نیازمندی‌ها و اجرا

به Node.js 22+ و pnpm 9+ نیاز دارد.

```bash
pnpm install
pnpm dev        # http://127.0.0.1:5173
pnpm test       # تست‌های واحد
pnpm typecheck  # بررسی انواع
pnpm build      # تولید dist/
pnpm preview    # پیش‌نمایش نسخه تولید
```

برای بارگذاری داده‌های آزمایشی در حالت توسعه، `http://127.0.0.1:5173/?demo=1` را باز کنید.

### فناوری

| حوزه | ابزارها |
|---|---|
| رابط کاربری | React 19، TypeScript، Vite 6 |
| طراحی | Tailwind CSS 4، سیستم Aurora Glass |
| داده‌ها | IndexedDB از طریق Dexie |
| PWA | vite-plugin-pwa، Workbox، Service Worker سفارشی |
| Android | Capacitor 8 و افزونه‌های بومی آن |
| QR | `qrcode` برای تولید، `jsqr` و `BarcodeDetector` برای خواندن |
| آزمون‌ها | Vitest |

### ساختار پروژه

```text
src/
├─ App.tsx                # ساختار، پیمایش، قفل، و به‌روزرسانی
├─ components/            # اجزای رابط کاربری مشترک
├─ features/              # compose, targets, templates, tools, settings
├─ lib/                   # ذخیره‌سازی، QR، شماره‌ها، پشتیبان، به‌روزرسانی‌ها
├─ hooks/                 # کوئری‌های Dexie
└─ styles/                # سیستم طراحی
android/                  # پروژه Capacitor Android
tests/                    # آزمون‌های Vitest
docs/                     # مستندات و تصاویر
```

### انتشار و ساخت APK

- انتشار در GitHub Pages از طریق `.github/workflows/deploy.yml` هنگام push به `main` پس از بررسی انواع و آزمون‌ها و ساخت انجام می‌شود.
- ساخت APK از طریق `.github/workflows/android.yml` هنگام push به `main` انجام می‌شود. امضای Release به اسرار Android keystore در تنظیمات مخزن نیاز دارد.
- گردش کار APK امضاشده را به‌عنوان Artifact برای مدت **14 روز** بارگذاری می‌کند. دانلود Artifact با دانلود نسخه منتشرشده در صفحه Releases تفاوت دارد.
- برای ساخت محلی امضاشده، از JDK 21 و Android SDK استفاده کنید و پیش از `./gradlew assembleRelease` متغیرهای `ANDROID_KEYSTORE_PATH`، `ANDROID_KEYSTORE_PASSWORD`، `ANDROID_KEY_ALIAS` و `ANDROID_KEY_PASSWORD` را تنظیم کنید.
- کلید امضای ثابت برای نصب به‌روزرسانی APK روی نسخه فعلی با حفظ داده‌هایش ضروری است.

### آزمون‌ها

آزمون‌های واحد تجزیه شماره‌ها، پیوندهای واتساپ، متغیرهای قالب، CSV/vCard، پشتیبان‌گیری، انتقال، و زمان‌بندی یادآورها و به‌روزرسانی‌ها را پوشش می‌دهند. [ماتریس آزمون دستی](docs/DEVICE-TEST-MATRIX.md) نیز موجود است.

## تاریخچه نسخه‌ها

| نسخه | مهم‌ترین تغییرات |
|---|---|
| **2.4.3** | Share Target بومی، میانبرهای برنامه، نام برنامه بر اساس زبان، و صفحه راهنمای چندزبانه |
| **2.4.2** | باز کردن موقعیت با Capacitor Geolocation و پیام‌های خطای دقیق‌تر |
| **2.4.1** | بازگرداندن دکمه ابزارها به نوار پیمایش و بهبود بررسی به‌روزرسانی |
| **2.4.0** | یادآورهای تکرارشونده، پیوست‌ها و پیش‌نمایش، پاک‌سازی تاریخچه و سطل زباله |
| **2.3.0** | انتقال داده، بررسی داده، عیب‌یابی دستگاه، و انتشار APK |
| **2.2.0** | افزودن فارسی و فونت‌های مناسب و مستندات چندزبانه |
| **2.1.0** | کردی، تکمیل خودکار، تور معرفی و اعلان‌های یادآور |
| **2.0.0** | بازسازی با React و PWA و ذخیره‌سازی محلی و فضاهای کاری |
| **1.0.0** | اولین نسخه پایدار |

برای تغییرات تفصیلی [CHANGELOG.md](CHANGELOG.md) را ببینید.

## مستندات و مجوزها

- [مشخصات و برنامه ساخت](SPEC.md) · [قرارداد توسعه](docs/DEV-CONTRACT.md) · [ماتریس دستگاه‌ها](docs/DEVICE-TEST-MATRIX.md)
- فونت‌های Cairo و Vazirmatn و Noto Naskh Arabic با مجوز OFL هستند. جزئیات مجوزهای وابستگی‌ها در [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## توسعه دهنده

<div align="center">

**ADMH - Ahmed Zeyad**

[GitHub](https://github.com/ahmdze) · [WhatsApp](https://wa.me/9647723064622)

<sub>توسعه‌یافته با Deepseek HARNESS · بازبینی فنی و مهندسی توسط Qwen</sub>

<sub>
کلیه حقوق محفوظ است 2026<br />
توسعه‌یافته با<br />
<strong>Deepseek-V4.1-Flash 1017</strong><br />
<strong>Deepseek-V4.1-Pro</strong><br />
<img src="docs/logos/deepseek-harness.svg" height="30" alt="DeepSeek HARNESS" /><br />
<strong>Qwen 3.8-Max</strong><br />
<img src="docs/logos/qwen.svg" height="30" alt="Qwen" /><br />
<a href="https://raw.githubusercontent.com/ahmdze/ADMH-DirectWhatsApp/main/docs/screenshots/usage-dashboard.jpg"><strong>Usage and Cost</strong></a>
</sub>

</div>
