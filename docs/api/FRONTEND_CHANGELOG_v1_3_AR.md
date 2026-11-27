# Print It — API Contract v1.3 (DRAFT) — تغييرات للفرونت

> **قيد المراجعة**: لا تستبدلوا عقد v1.2 على `master` بشكل صامت. هذه تغييرات مؤثرة (Breaking Changes)، وتحتاج موافقة وتنفيذ الفريقين. عنوان الـAPI يظل `/api/v1`.

## التغييرات الأساسية

| قبل (v1.2) | بعد (v1.3) | الأثر على الواجهة |
|---|---|---|
| `priceMinor: 15000` | `price: "150.00"` | `price` نص عشري ثابت من خانتين، بعملة SYP، وليس رقماً بوحدة القرش |
| `startingPriceMinor` | `startingPrice` | عرض "ابتداءً من..." مع التحويل من decimal string |
| `estimatedUnitCostMinor` | `unitCost` | **للأدمن فقط**؛ لا تعرضها للعميل |
| `unitPriceMinor`, `lineTotalMinor` | `unitPrice`, `lineTotal` | كل المبالغ نصوص عشرية |
| `subtotalMinor`, `shippingFeeMinor`, `totalMinor` | `subtotal`, `shippingFee`, `total` | الشحن ثابت محسوب من الباك مرة واحدة لكل Order |
| `amountMinor` | `amount` | مبلغ محاولة الدفع يطابق `Order.total` |
| `designFeeMinor` | **محذوف** | سعر القطعة المخصصة يشمل التصميم والتصنيع |
| `Quote.shippingFeeMinor` | **محذوف** | Quote قبل الشحن؛ العميل يرى الشحن والإجمالي النهائي في Order قبل الدفع |
| `usageContext`, `deviceBrand`, `deviceModel`, `deliveryCity`, `deliveryRegion` | **محذوفة من Custom Request** | بيانات الجهاز والاستخدام تُكتب في `description`؛ العنوان يطلب عند إنشاء Order |
| `/orders/{id}/status-history` | **محذوف** | استخدام `Order.status` الحالية فقط |
| لا يوجد Reorder | `sourceRequestId` اختياري في POST `/custom-requests` | يمكن تعبئة فورم من طلب سابق، ونسخ صور بعد التحقق من ملكيته وحالة Order الأصلية `DELIVERED` أو `CANCELLED` |
| Admin Quote بدون تكلفة داخلية | `estimatedCost` اختياري في Admin Quote | **لا يظهر للعميل**؛ تكلفة الطلب المخصص كاملًا |

## الفلوهات المتفق عليها

**Catalog:** منتجات لها Variants (`IN_STOCK`, `MADE_TO_ORDER`)؛ سلة بالمتصفح؛ Order من `POST /orders`؛ رسوم الشحن تضاف تلقائياً؛ عند SUCCESS للدفع يتم التحقق من المخزون وخصمه ذرياً؛ لا حجز مخزون عند Checkout.

**Custom:** إرسال مباشر بالصور → مراجعة الأدمن → `NEEDS_INFO` أو `REJECTED` أو Quote (واحدة، 7 أيام) → قبول Quote وإدخال العنوان → Order مع رسم توصيل ثابت → Mock Payment. إعادة الطلب تعني Request جديدة وQuote جديدة، وليست إعادة استخدام Quote.

**Status واحد لكل Order**؛ لا شحن جزئي. جميع القطع الجاهزة يمكن أن تقفز من `CONFIRMED` إلى `READY_FOR_DELIVERY`، أما الطلب الذي يحتاج تصنيعاً فيمر عبر `IN_PROGRESS`.

**مرفقات:** JPEG/PNG/WebP، بحد 5 صور، كل صورة حتى 10,485,760 بايت (10 MiB). حقول `removeAttachmentIds` مكررة بنفس الاسم ضمن multipart؛ `measurementsJson` نص JSON.

## تمثيل المبالغ

```json
{
  "unitPrice": "150.00",
  "quantity": 2,
  "lineTotal": "300.00",
  "shippingFee": "20.00",
  "total": "320.00",
  "currency": "SYP"
}
```

هذه **أمثلة فقط**. قيمة الشحن الفعلية ما زالت قرار إعدادات تطبيق؛ لا تعتمدوا قيمة `20.00` في الكود.

## نقاط بانتظار تأكيد التنفيذ

- اسم Cookie الذي يرجع فعلياً من `Set-Cookie`، وإعدادات CORS وSameSite/Secure.
- تنفيذ CSRF ومخرجات `403` و`error.details` الفعلية من NestJS.
- `/auth/resend-otp` وحساب التطوير المفعّل؛ وجودهما بالعقد لا يعني جاهزيتهما على السيرفر.
- تفاصيل Upload/Storage وحدّ الصور في التنفيذ.
- تنفيذ Reorder نفسه: يجب التحقق من طلب مصدر للعميل من Order مخصص مسلم أو ملغى، وأن تُنسخ المرفقات دون التأثير على الأصل.

**لا تعملوا Merge لتغيير العقد قبل تنسيق الـDTOs والـControllers مع الفرونت.**
