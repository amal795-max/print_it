-- Print It · PostgreSQL design review · NOT a deployed migration
-- Contracts: SYP NUMERIC(12,2) (JSON decimal strings), 12 tables, no saved cart, no status history.
-- Session/OTP ephemeral store: Redis (outside this PostgreSQL ERD).
-- For illustration of PostgreSQL constraints; choose Prisma or TypeORM before formal migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER','ADMIN')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_ci_uq ON users (lower(btrim(email)));

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products (category_id);

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku VARCHAR(80) NOT NULL UNIQUE,
  material VARCHAR(80) NOT NULL,
  color VARCHAR(80) NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  unit_cost NUMERIC(12,2) CHECK (unit_cost >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'SYP' CHECK (currency = 'SYP'),
  fulfillment_mode VARCHAR(20) NOT NULL CHECK (fulfillment_mode IN ('IN_STOCK','MADE_TO_ORDER')),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  estimated_production_days INTEGER CHECK (estimated_production_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT variant_mode_stock_ck CHECK (
    (fulfillment_mode = 'IN_STOCK' AND estimated_production_days IS NULL)
    OR (fulfillment_mode = 'MADE_TO_ORDER' AND stock_quantity = 0 AND estimated_production_days IS NOT NULL)
  )
);
CREATE UNIQUE INDEX product_variant_specs_uq ON product_variants
  (product_id, lower(btrim(material)), lower(btrim(color)));
CREATE INDEX product_variants_product_idx ON product_variants (product_id);

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  storage_key TEXT NOT NULL,
  alt_text VARCHAR(180),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_sort_idx ON product_images (product_id, sort_order);

CREATE TABLE custom_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_request_id UUID REFERENCES custom_requests(id) ON DELETE RESTRICT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('BROKEN_PART','FROM_IMAGE')),
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  measurements_mm JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFO','REJECTED','QUOTED')),
  review_note TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT custom_not_self_source_ck CHECK (source_request_id IS DISTINCT FROM id),
  CONSTRAINT needs_info_reason_ck CHECK (status <> 'NEEDS_INFO' OR nullif(btrim(review_note),'') IS NOT NULL),
  CONSTRAINT rejected_reason_ck CHECK (status <> 'REJECTED' OR nullif(btrim(rejection_reason),'') IS NOT NULL),
  CONSTRAINT measurements_is_object_ck CHECK
    (measurements_mm IS NULL OR jsonb_typeof(measurements_mm) = 'object')
);
CREATE INDEX custom_requests_customer_idx ON custom_requests (customer_id, created_at DESC);
CREATE INDEX custom_requests_review_queue_idx ON custom_requests (status, created_at DESC);

CREATE TABLE request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES custom_requests(id) ON DELETE RESTRICT,
  storage_key TEXT NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(80) NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX request_attachments_request_idx ON request_attachments (request_id);

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES custom_requests(id) ON DELETE RESTRICT,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  material VARCHAR(100) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  estimated_cost NUMERIC(12,2) CHECK (estimated_cost >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'SYP' CHECK (currency = 'SYP'),
  estimated_days INTEGER NOT NULL CHECK (estimated_days BETWEEN 1 AND 90),
  notes TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'SENT'
    CHECK (status IN ('SENT','ACCEPTED','DECLINED','EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quote_math_ck CHECK (total = unit_price * quantity),
  CONSTRAINT quote_expiry_after_issue_ck CHECK (expires_at > created_at)
);
CREATE INDEX quotes_status_expiry_idx ON quotes (status, expires_at);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source VARCHAR(12) NOT NULL CHECK (source IN ('CATALOG','CUSTOM')),
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING_PAYMENT'
    CHECK (status IN ('PENDING_PAYMENT','CONFIRMED','IN_PROGRESS',
                     'READY_FOR_DELIVERY','SHIPPED','DELIVERED','CANCELLED')),
  shipping_address JSONB NOT NULL CHECK (jsonb_typeof(shipping_address) = 'object'),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  shipping_fee NUMERIC(12,2) NOT NULL CHECK (shipping_fee >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'SYP' CHECK (currency = 'SYP'),
  idempotency_key VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_math_ck CHECK (total = subtotal + shipping_fee),
  CONSTRAINT order_customer_idem_uq UNIQUE (customer_id, idempotency_key)
);
CREATE INDEX orders_customer_created_idx ON orders (customer_id, created_at DESC);
CREATE INDEX orders_status_created_idx ON orders (status, created_at DESC);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  quote_id UUID UNIQUE REFERENCES quotes(id) ON DELETE RESTRICT,
  title_snapshot VARCHAR(180) NOT NULL,
  material_snapshot VARCHAR(100),
  color_snapshot VARCHAR(80),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  estimated_cost NUMERIC(12,2) CHECK (estimated_cost >= 0),
  fulfillment_mode VARCHAR(20) NOT NULL CHECK (fulfillment_mode IN ('IN_STOCK','MADE_TO_ORDER')),
  estimated_production_days INTEGER CHECK (estimated_production_days > 0),
  CONSTRAINT order_item_one_source_ck CHECK (num_nonnulls(product_variant_id, quote_id) = 1),
  CONSTRAINT order_item_math_ck CHECK (line_total = unit_price * quantity),
  CONSTRAINT custom_made_to_order_ck CHECK (quote_id IS NULL OR fulfillment_mode = 'MADE_TO_ORDER'),
  CONSTRAINT order_variant_once_uq UNIQUE (order_id, product_variant_id)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  status VARCHAR(16) NOT NULL CHECK (status IN ('SUCCEEDED','FAILED')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'SYP' CHECK (currency = 'SYP'),
  idempotency_key VARCHAR(120) NOT NULL,
  failure_reason VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_order_idem_uq UNIQUE (order_id, idempotency_key),
  CONSTRAINT failed_reason_ck CHECK (status <> 'FAILED' OR failure_reason IS NOT NULL)
);
CREATE UNIQUE INDEX one_successful_payment_per_order ON payment_attempts (order_id)
  WHERE status = 'SUCCEEDED';
CREATE INDEX payment_attempts_order_created_idx ON payment_attempts (order_id, created_at DESC);

CREATE TABLE order_item_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce in NestJS services/transaction, not a row-local CHECK:
-- 1) A custom request has 1–5 attachments after creation/resubmission.
-- 2) A source_request_id is owned by current user and has a CUSTOM Order DELIVERED or CANCELLED.
-- 3) A quote's quantity matches its request; seven-day expiry is set and checked by server.
-- 4) Orders have >=1 item; source matches all item sources (CATALOG vs CUSTOM).
-- 5) orders.subtotal equals sum(order_items.line_total), snapshot price on checkout.
-- 6) Custom quotes: one order_items row max per quote, no reuse; accepting quote is atomic.
-- 7) Only owner can review an item and only if its Order is DELIVERED.
-- 8) Payment SUCCESS: order lock + stock update + attempt insert + status CONFIRMED atomically.
-- 9) Shipping fee fixed at configuration when Order is created, never supplied by client.
-- 10) Admin-only cost fields are never included in public API DTOs.
-- 11) created_at/updated_at timestamps, status transitions, case normalization in services.
