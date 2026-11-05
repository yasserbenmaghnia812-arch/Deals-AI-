# DZ Deals AI

تطبيق تجريبي عربي RTL لمساعدة المتسوق في الجزائر، مبني باستخدام React وVite وCapacitor وSupabase.

## الوظائف الحالية
- البحث عن المنتجات بفتح نتائج البحث الرسمية في AliExpress وTemu.
- إنشاء حساب وتسجيل الدخول بالبريد الإلكتروني عبر Supabase Auth.
- حفظ المنتجات في قائمة المقارنة داخل حساب المستخدم.
- حفظ سجل البحث عند تسجيل الدخول.
- حفظ أرقام تتبع الطرود في حساب المستخدم وفتح صفحة 17TRACK.
- قاعدة بيانات مع Row Level Security وسياسات تمنع المستخدم من الوصول إلى بيانات مستخدم آخر.

## حدود النسخة الحالية
- لا يوجد جلب تلقائي للأسعار أو التقييمات أو الكوبونات.
- لا يوجد ربط API مباشر مع 17TRACK؛ التطبيق يفتح موقع التتبع.
- المساعد الذكي لا يستدعي نموذج LLM بعد.
- الحسابات الجديدة قد تتطلب تأكيد البريد الإلكتروني حسب إعدادات Auth في المشروع.

## Supabase
- Project ref: `ohfsbiuxwsjbvxpmjyqd`
- استخدم `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY` من إعدادات المشروع.
- المفتاح Publishable مخصص للواجهة العامة ويجب أن يقترن بسياسات RLS.
- لا تضع أبداً `service_role` أو Secret key في التطبيق أو APK.
- مخطط الجداول موجود في `supabase/migrations/202611050001_initial_user_data.sql`.

## التطوير المحلي
1. انسخ `.env.example` إلى `.env`.
2. ثبّت الحزم: `npm install`.
3. شغّل: `npm run dev`.

## بناء Android APK
GitHub Actions يبني Debug APK تلقائياً عند كل تحديث لفرع `main` أو يدوياً من تبويب Actions.
بعد نجاح المهمة:
1. افتح تشغيل Build Android APK.
2. نزّل Artifact باسم `DZ-Deals-AI-debug-apk`.
3. فك ضغط ZIP وثبّت `app-debug.apk` على Android.

هذا Debug APK للاختبار، وليس إصداراً موقّعاً للنشر في Google Play. ملف Artifact يبقى 30 يوماً.

## المجانية والشفافية
تم إعداد المشروع على Supabase Free فقط، وبناء APK عبر GitHub Actions. لا توجد خدمة مدفوعة مضافة. قد تتغير حدود الخطط المجانية بمرور الوقت. لا يتم تنفيذ scraping غير مصرح به لمواقع المتاجر.