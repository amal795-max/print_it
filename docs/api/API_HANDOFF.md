# Print It — Frontend Handoff (Contract v1.2 — Hybrid Inventory)

**Use `docs/api/openapi.yaml` as the single source of truth.** All HTTP routes stay under `/api/v1`, even though the document version is `1.2.0`. Auth is Session Cookies + OTP and remains unchanged.

## Changes from contract v1.1

1. Catalog is now **hybrid**: a ProductVariant is `IN_STOCK` (ready quantity) or `MADE_TO_ORDER` (printed after successful payment).
2. `GET /products` and `GET /products/{id}` include `startingPriceMinor` (min available variant price; nullable if sold out) and per-variant `fulfillmentMode`, `stockQuantity`, `estimatedProductionDays`, `isAvailable`.
3. Product images remain shared for the Product; selecting a different variant does **not** change images.
4. Admin variant create/edit accepts `fulfillmentMode`, `stockQuantity`, optional `estimatedProductionDays` and optional internal `estimatedUnitCostMinor`. **Cost fields are not returned in customer endpoints.**
5. Browser cart stays browser-only. On `POST /orders`, the server validates unique variant IDs and computes totals. **No inventory reservation yet**.
6. On simulated successful payment, stock is checked and deducted inside a DB transaction. If unavailable, `409` + `error.code=OUT_OF_STOCK`; allow user to cancel/rebuild order. A simulated payment failure records a failed attempt and permits retry.
7. `OrderItem` includes `fulfillmentModeSnapshot` so mixed orders are represented correctly.
8. Statuses remain `PENDING_PAYMENT`, `CONFIRMED`, `IN_PROGRESS`, `READY_FOR_DELIVERY`, `SHIPPED`, `DELIVERED`, `CANCELLED`. All-stock orders may skip `IN_PROGRESS`; production orders may not.
9. Currency is `SYP`; money fields are integer *minor* units, not decimal floating point. Website is Arabic RTL; PLA/PETG remain technical labels.

**Example public product response fragment (illustrative, not a live API):**

```json
{
  "id": "7b246eda-c89a-450c-8e24-160aa1f23dea",
  "title": "مقبض غسالة",
  "startingPriceMinor": 15000,
  "variants": [
    {"id":"bda8daab-35b3-4f46-a9b5-d1804c815c88","material":"PLA","color":"أسود","priceMinor":15000,"currency":"SYP","fulfillmentMode":"IN_STOCK","stockQuantity":3,"estimatedProductionDays":null,"isAvailable":true},
    {"id":"bb7a8a2a-0a10-4f2c-aeab-988c1147ae1a","material":"PETG","color":"أسود","priceMinor":20000,"currency":"SYP","fulfillmentMode":"MADE_TO_ORDER","stockQuantity":0,"estimatedProductionDays":4,"isAvailable":true}
  ]
}
```

The full Product and Variant schemas contain additional required fields; refer to the YAML, not this fragment. In the frontend: display `ابتداءً من ...`, show available stock/lead-time hints, and handle out-of-stock at payment. Do not rely on stale browser prices or cached stock as authoritative.


---

# Print It — API Contract v1.2: قرارات التسليم الأساسية

## 1. المرجع الرئيسي

**الملف `docs/api/openapi.yaml` هو المرجع الحالي المشترك للفرونت والباك (Contract v1.2).** يحل محل نسخ v1 وv1.1 السابقة. ملف Postman القديم الذي يحتوي `/parts` لا يستخدم كمرجع للكتالوج، وإنما كان مصدر الاتفاق على Auth فقط.

- Base path: `/api/v1` (اختاروا PORT من إعدادات التشغيل؛ 3000 في الأمثلة فقط).
- Frontend cart في المتصفح، لا يوجد Backend cart endpoint.
- Catalog: `/products` + variants، مع Hybrid Inventory: كل Variant إما `IN_STOCK` أو `MADE_TO_ORDER`؛ نموذج `/parts` القديم من Postman غير معتمد.
- Custom Request: `BROKEN_PART` أو `FROM_IMAGE`، إنشاء Multipart مباشرة، وحالات المراجعة كما اتفقنا.
- Quotes: عرض واحد لكل Request، ويحتوي `designFeeMinor + unitPriceMinor*quantity + shippingFeeMinor` وصالح 7 أيام.
- Orders: `PENDING_PAYMENT → CONFIRMED → IN_PROGRESS → READY_FOR_DELIVERY → SHIPPED → DELIVERED`؛ إذا كل الـItems متوفرة بالمخزون ممكن تجاوز `IN_PROGRESS` بعد التأكيد. `CANCELLED` قبل الدفع الناجح فقط.
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

- **للفرونت:** `docs/api/openapi.yaml` + هذا الملف. اعتمدوا العقد v1.2 بدل النسخ السابقة.
- **لزميلة Auth:** نفس الـYAML؛ يمكنها إبقاء Postman Auth الحالية بشرط توحيد Routes وOTP وCookie وCSRF؛ تأكدوا من OTP، URL prefix، Cookie name، CSRF، تسجيل `role`، Login 403.
- **لفريق الباك:** الـERD `docs/architecture/ERD.drawio` لتحديث `users.full_name`, `phone`, `is_verified` و`currency` في Quotes.

## 5. ما تبقى لحسمه بدون إيقاف التطوير

1. **قيمة رسم الشحن الثابت للمكتبة** (بالقرش) قبل عرض الأسعار بالديمو.
2. **طريقة استضافة الويب والـAPI** (Same-Origin أو Origins مختلفة) لضبط Cookies وCORS وCSRF.
3. **إثبات التنفيذ**: تشغيل Login/OTP/CSRF فعلياً، والتأكد أن `session` هو اسم Cookie الحقيقي، وأن `resend-otp` تمت برمجته.

## 6. ملاحظة مهمة

Postman Collection الأصلية هي **أمثلة متوقعة**، وليست دليلاً على أن endpoints منفذة. اتفقوا على OpenAPI v1.2 كعقد، ثم نفذوا واختبروا المتبقي. إذا لدى زميلة Auth كود منشور فعلياً بأسماء مختلفة، يجب توحيدها قبل إرسال عقود متناقضة ثانية للفرونت.

---

## تحديث نفس Pull Request

ارفع الملفات في Branch `docs/api-contract-v1.1` الموجود سلفاً، واستبدل YAML وDrawio وأضف ملف التصميم. الـPR #1 سيتحدّث تلقائياً؛ لا تفتح PR ثانية إذا القديمة مفتوحة. وبعد مراجعة أمل اعملوا Squash & Merge.
