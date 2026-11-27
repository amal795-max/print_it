# Print It — قاعدة البيانات v1.3 (تصميم للمراجعة)

**12 جدولاً فقط، PostgreSQL، Modular Monolith.** الـCart عند الفرونت؛ Redis مستهدف للـSessions والـOTP (خارج مخطط PostgreSQL). ما في `order_status_history`، ولا `user_addresses`، ولا `notifications`، ولا `quote_items` بالـMVP.

## تسميات الحقول المالية

- جميع أسعار قاعدة البيانات: `NUMERIC(12,2)` مع `CHECK >= 0`، وبالعملة الوحيدة `SYP`.
- حقل JSON يخرج **كنص** فيه خانتان عشريتان (مثال: `"150.00"`)، لتجنب مشاكل float في JavaScript.
- `product_variants.price`: سعر البيع للوحدة؛ `unit_cost`: تكلفة تصنيع تقديرية للوحدة **للأدمن فقط**.
- `quotes.unit_price`: سعر البيع للوحدة، شامل التصميم والتصنيع؛ `quotes.estimated_cost`: تكلفة تنفيذ **الطلب كله** (تقديرية للأدمن فقط)، و`quotes.total = unit_price × quantity`، **بدون شحن**.
- `order_items.estimated_cost`: تكلفة تقديرية **لكامل السطر** وSnapshot وقت الشراء، وليست تكلفة الوحدة.
- `orders.shipping_fee`: رسم ثابت من إعدادات السيرفر وقت إنشاء Order، يُخزّن Snapshot، ويُضاف مرة واحدة: `orders.total = subtotal + shipping_fee`.
- لا يوجد `design_fee` منفصل، ولا حساب ربح مخزّن؛ التقارير المستقبلية تُحسب من سعر البيع وSnapshot التكاليف.

## العلاقات الأساسية وقيود SQL

- `categories` 1→N `products`، وكل Product اختياريًا له Category واحدة.
- `products` 1→N `product_variants` و1→N `product_images`، الصور **مشتركة** لكل Variants.
- `users` 1→N `custom_requests`، 1→N `orders`، و1→N `quotes` بصفته Admin محضّر العرض.
- `custom_requests` 1→N `request_attachments`، و1→0..1 `quotes` مع `UNIQUE(quotes.request_id)`.
- `custom_requests.source_request_id` علاقة ذاتية اختيارية (Reorder). لا إنشاء Reorder إلا من Custom Order لها حالة `DELIVERED` أو `CANCELLED` وصاحبها نفس المستخدم؛ نسخ البيانات/الصور إلى Request جديدة ثم Quote جديدة؛ لا نعيد استخدام Quote السابقة.
- `orders` 1→N `order_items` و1→N `payment_attempts`.
- `order_items.product_variant_id` و`quote_id`: **XOR**، أحدهما غير NULL والآخر NULL؛ Quote تُشترى مرة واحدة فقط (`UNIQUE(quote_id)`).
- `order_items` 1→0..1 `order_item_reviews` عبر `UNIQUE(order_item_id)`، والتقييم فقط إذا Order بحالة `DELIVERED` ومن صاحبها.
- `payment_attempts`: `UNIQUE(order_id, idempotency_key)` وفهرس فريد مشروط لمحاولة `SUCCEEDED` واحدة لكل Order.
- `product_variants`: `IN_STOCK` مع كمية صحيحة غير سالبة، أو `MADE_TO_ORDER` مع `stock_quantity=0` و`estimated_production_days` صالح. قيد يمنع تكرار `(product_id, material, color)` بعد تطبيع النص.

## ما يجب تطبيقه في NestJS وليس بـCHECK محلي فقط

1. كل `CustomRequest` مرسلة لها 1–5 صور بعد الإضافة أو التعديل (القيود عبر جدول آخر).
2. Quote واحدة لكل Request، نفس `quantity` المقبولة، وصلاحية 7 أيام.
3. فحص أن `orders.subtotal` يطابق مجموع `order_items.line_total`، وأن الطلب له عنصر واحد على الأقل، وأن مصدر كل Item يطابق `orders.source`.
4. التحقق من الملكية والصلاحيات ومنع تغيير الحالات خارج انتقالاتها المسموحة.
5. عند نجاح Mock Payment: قفل Order والتحقق من Stock، وخصم الكميات بشكل ذري وترتيب ثابت، وإضافة Attempt ناجحة وتغيير Order إلى `CONFIRMED` **ضمن Transaction واحدة**. عند نفاد المخزون يرجع `409 OUT_OF_STOCK` بلا خصم ولا Attempt ناجحة.
6. إلغاء Order قبل الدفع فقط، ولا إعادة فتح Order ملغاة؛ Reorder تنشئ Request جديدة.
7. تاريخ الدفع والشحن: حالة Order الحالية فقط (لا Timeline تاريخية في قاعدة البيانات).
8. حذف صور Reorder من الطلب الجديد **لا يحذف الملف الأصلي**: إما نسخ الملفات بمعرفات مستقلة أو تتبع مراجع التخزين بشكل آمن.

## ملاحظة على الـERD

ملف `.drawio` أربع صفحات، **كل Attribute ظاهر كسطر قابل للتعديل**، مع TYPE وRULE، وخلفية بيضاء وإخفاء Grid. الصفحة الأولى فيها جميع الجداول، والصفحات الباقية للتفاصيل. ملف SQL هو مرجع للمراجعة وليس Migration مطبقة؛ اختيار Prisma أو TypeORM ما زال بحاجة قرار الفريق.
