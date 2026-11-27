# Print It — API Contract v1.1: قرارات التسليم

## 1. المرجع الرئيسي

**الملف `Print_It_OpenAPI_v1_1_Aligned.yaml` هو المرجع الوحيد الجديد للفرونت والباك.** يحل محل YAML v1 السابق. ملف Postman القديم الذي يحتوي `/parts` لا يستخدم كمرجع للكتالوج، وإنما كان مصدر الاتفاق على Auth فقط.

- Base path: `/api/v1` (اختاروا PORT من إعدادات التشغيل؛ 3000 في الأمثلة فقط).
- Frontend cart في المتصفح، لا يوجد Backend cart endpoint.
- Catalog: `/products` + variants، وكلها تصنع عند الطلب؛ `inStock` القديم من Postman غير معتمد.
- Custom Request: `BROKEN_PART` أو `FROM_IMAGE`، إنشاء Multipart مباشرة، وحالات المراجعة كما اتفقنا.
- Quotes: عرض واحد لكل Request، ويحتوي `designFeeMinor + unitPriceMinor*quantity + shippingFeeMinor` وصالح 7 أيام.
- Orders: `PENDING_PAYMENT → CONFIRMED → IN_PROGRESS → READY_FOR_DELIVERY → SHIPPED → DELIVERED`, و`CANCELLED` قبل الدفع الناجح فقط.
- Reviews لكل `OrderItem` بعد تسليم Order.

## 2. Auth (مراجعة مع زميلة الباك)

| Method | Path | Request | Result |
|---|---|---|---|
| GET | `/auth/csrf-token` | — | `{csrfToken}`؛ يعاد بعد تسجيل الدخول |
| POST | `/auth/register` | `{fullName,email,phone,password}` | `201` + `{user}` مع `isVerified:false`، مع إرسال OTP |
| POST | `/auth/verify-otp` | `{email,otpCode}` | `200` + رسالة نجاح |
| POST | `/auth/resend-otp` | `{email}` | `200` رسالة عامة؛ **إضافة مقترحة غير موجودة في Postman الأصلي ويجب تنفيذها** |
| POST | `/auth/login` | `{email,password}` | `200` + `{user}` و`Set-Cookie`، دون JWT |
| GET | `/auth/me` | Session cookie | `200` + User |
| POST | `/auth/logout` | Session + CSRF | `204` + حذف الـCookie |

**قواعد لا بد منها:**
- ممنوع إرسال/تعيين `role` من العميل؛ التسجيل العام ينشئ `CUSTOMER` فقط.
- User Response = `{id,fullName,email,phone,role,isVerified,createdAt}`، دون `passwordHash`.
- نفترض أن Login قبل التحقق من البريد يعيد `403 EMAIL_NOT_VERIFIED` بعد التحقق من كلمة المرور. أعلموا الفرونت بهذه الحالة.
- OTP بستة أرقام نصية، يُخزن Hash، مستعمل مرة واحدة، له وقت انتهاء وحد محاولات/إعادة إرسال. زمن الانتهاء وقناة البريد تظل تفاصيل تنفيذ عند Auth owner.
- Cookie اسمها `session` وفق **مثال** Postman الزميلة. تحققوا من `Set-Cookie` الحقيقي؛ إذا الاسم مختلف عدّلوا الـOpenAPI والفرونت في نفس الوقت.
- HTTP `POST/PATCH/DELETE` تحتاج `X-CSRF-Token`، حسب العقد الجديد؛ واجب على الباك تنفيذ حماية حقيقية، والفرونت يعمل GET CSRF أولاً وبعد Login من جديد.
- للـFrontend: عند Cross-Origin استخدموا `credentials: 'include'` وCORS allow-origin محدد، وعلى HTTPS `Secure` cookie. لا تعتمِدوا إعدادات Postman وحدها على أنها ضبط متصفح صحيح.

## 3. عملة عربية واحدة

- `currency = "SYP"` فقط؛ **الليرة السورية الجديدة**.
- `priceMinor`, `designFeeMinor`, `shippingFeeMinor`, `totalMinor` أعداد صحيحة بـ **القرش**؛ 100 قرش = 1 SYP.
- مثال: `priceMinor = 25000` يعني **250 ليرة سورية جديدة**. لا تحولوا أسعار USD القديمة حسابياً أو تضعوها كقيم SYP؛ حددوا أسعار تجريبية جديدة.
- اللغة الافتراضية للواجهة والمحتوى ورسائل الخطأ العربية، لكن أسماء JSON والـEnums التقنية بالإنجليزية (`IN_PROGRESS`, `PETG`).
- الفرونت ينسق النصوص RTL بنفسه؛ لا يفترض دقة عرض صفرية من مكتبة Format تلقائياً: طبقوا `/100` عندما تعرضون `*Minor`.
- `CATALOG_SHIPPING_FEE_MINOR` قيمة إعداد على السيرفر **لم تُحدد رقمياً بعد**؛ يجب الاتفاق عليها قبل تجهيز Seed نهائي.

## 4. مين يبعث شو؟

- **للفرونت:** `Print_It_OpenAPI_v1_1_Aligned.yaml` + هذا الملف. لا تعيدوا إرسال النسخة القديمة معهما.
- **لزميلة Auth:** نفس الـYAML + `Print_It_Auth_v1_1_Aligned.postman_collection.json`؛ تأكدوا من OTP، URL prefix، Cookie name، CSRF، تسجيل `role`، Login 403.
- **لفريق الباك:** الـERD النسخة `Print_It_ERD_v1_1_Users_Updated.drawio` لتحديث `users.full_name`, `phone`, `is_verified` و`currency` في Quotes.

## 5. ما تبقى لحسمه بدون إيقاف التطوير

1. **قيمة رسم الشحن الثابت للمكتبة** (بالقرش) قبل عرض الأسعار بالديمو.
2. **طريقة استضافة الويب والـAPI** (Same-Origin أو Origins مختلفة) لضبط Cookies وCORS وCSRF.
3. **إثبات التنفيذ**: تشغيل Login/OTP/CSRF فعلياً، والتأكد أن `session` هو اسم Cookie الحقيقي، وأن `resend-otp` تمت برمجته.

## 6. ملاحظة مهمة

Postman Collection الأصلية هي **أمثلة متوقعة**، وليست دليلاً على أن endpoints منفذة. اتفقوا على OpenAPI v1.1 كعقد، ثم نفذوا واختبروا المتبقي. إذا لدى زميلة Auth كود منشور فعلياً بأسماء مختلفة، يجب توحيدها قبل إرسال عقود متناقضة ثانية للفرونت.
