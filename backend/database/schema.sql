-- صيدلية برو | Pharmacy Pro — مخطط قاعدة البيانات
-- شغّل هذا الملف مرة واحدة على MySQL 8+ لإنشاء القاعدة وكل الجداول

CREATE DATABASE IF NOT EXISTS pharmacy_pro
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pharmacy_pro;

-- المستخدمون: كل الأدوار (مريض، طبيب، صيدلية، أدمن) في جدول واحد
CREATE TABLE IF NOT EXISTS users (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name         VARCHAR(150)  NOT NULL,
  email             VARCHAR(150)  NOT NULL,
  phone             VARCHAR(20)   NOT NULL,
  password_hash     VARCHAR(255)  NOT NULL,
  role              ENUM('patient','doctor','pharmacy','delivery','admin') NOT NULL,
  status            ENUM('pending_verification','active','blocked') NOT NULL DEFAULT 'active',
  is_verified       TINYINT(1)    NOT NULL DEFAULT 0,
  address           VARCHAR(255)  NULL,
  latitude          DECIMAL(10,8) NULL,
  longitude         DECIMAL(11,8) NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_role (role),
  KEY idx_users_status (status)
) ENGINE=InnoDB;

-- بيانات إضافية خاصة بحسابات الصيدليات (تنتظر توثيق الأدمن)
CREATE TABLE IF NOT EXISTS pharmacy_profiles (
  user_id           INT UNSIGNED PRIMARY KEY,
  pharmacy_name     VARCHAR(150)  NOT NULL,
  owner_name        VARCHAR(150)  NOT NULL,
  license_number    VARCHAR(100)  NULL,
  -- تُترك NULL عندما يُنشئ الأدمن حساب الصيدلية مباشرة بدون صور (بدل رفع المالك للصورتين بنفسه)
  exterior_image    VARCHAR(255)  NULL,
  interior_image    VARCHAR(255)  NULL,
  created_by_admin  TINYINT(1)    NOT NULL DEFAULT 0,
  -- بيانات التحويل البنكي التي يراها المريض عند الدفع (اسم البنك/التطبيق + رقم الحساب + اسم صاحبه)
  payment_details   VARCHAR(255)  NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- بيانات إضافية خاصة بحسابات الأطباء
CREATE TABLE IF NOT EXISTS doctor_profiles (
  user_id           INT UNSIGNED PRIMARY KEY,
  specialty         VARCHAR(120)  NULL,
  license_number    VARCHAR(100)  NULL,
  clinic_address    VARCHAR(255)  NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- بيانات إضافية خاصة بحسابات مندوبي التوصيل
CREATE TABLE IF NOT EXISTS delivery_profiles (
  user_id           INT UNSIGNED PRIMARY KEY,
  vehicle_type      VARCHAR(60)   NULL,
  service_area      VARCHAR(150)  NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- مخزون الأدوية لكل صيدلية
CREATE TABLE IF NOT EXISTS medicines (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pharmacy_id       INT UNSIGNED NOT NULL,
  medicine_name     VARCHAR(150)  NOT NULL,
  description       VARCHAR(500)  NULL,
  price             DECIMAL(10,2) NOT NULL,
  quantity          INT UNSIGNED  NOT NULL DEFAULT 0,
  is_available      TINYINT(1)    NOT NULL DEFAULT 1,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pharmacy_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_medicines_pharmacy (pharmacy_id),
  KEY idx_medicines_name (medicine_name)
) ENGINE=InnoDB;

-- طلبات شراء الأدوية من الصيدلية عبر الموقع، مع إيصال تحويل للتأكد من الدفع
CREATE TABLE IF NOT EXISTS orders (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id          INT UNSIGNED NOT NULL,
  pharmacy_id         INT UNSIGNED NOT NULL,
  delivery_id         INT UNSIGNED NULL,
  status              ENUM(
                        'payment_review',   -- بانتظار مراجعة الصيدلية لإيصال التحويل
                        'payment_rejected',  -- الصيدلية رفضت الإيصال/الدفع
                        'preparing',         -- تم تأكيد الدفع، الصيدلية تجهّز الطلب
                        'out_for_delivery',  -- الطلب في الطريق (مع مندوب توصيل أو تسليم ذاتي)
                        'delivered',         -- تم التسليم
                        'cancelled'          -- ألغاه المريض قبل المراجعة
                      ) NOT NULL DEFAULT 'payment_review',
  total_amount        DECIMAL(10,2) NOT NULL,
  delivery_address     VARCHAR(255)  NOT NULL,
  delivery_fee         DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_proof_image  VARCHAR(255)  NOT NULL,
  rejection_reason     VARCHAR(255)  NULL,
  notes                VARCHAR(500)  NULL,
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pharmacy_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (delivery_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_orders_patient (patient_id),
  KEY idx_orders_pharmacy (pharmacy_id),
  KEY idx_orders_delivery (delivery_id)
) ENGINE=InnoDB;

-- عناصر كل طلب (لقطة من اسم الدواء وسعره وقت الشراء، حتى لو تغيّر لاحقًا في المخزون)
CREATE TABLE IF NOT EXISTS order_items (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id          INT UNSIGNED NOT NULL,
  medicine_id        INT UNSIGNED NULL,
  medicine_name       VARCHAR(150)  NOT NULL,
  unit_price          DECIMAL(10,2) NOT NULL,
  quantity             INT UNSIGNED  NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL,
  KEY idx_order_items_order (order_id)
) ENGINE=InnoDB;

-- الروشتات التي يرفعها المريض لصيدلية أو طبيب
CREATE TABLE IF NOT EXISTS prescriptions (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id        INT UNSIGNED NOT NULL,
  target_role       ENUM('pharmacy','doctor') NOT NULL,
  target_id         INT UNSIGNED NOT NULL,
  image_path        VARCHAR(255)  NOT NULL,
  notes             VARCHAR(500)  NULL,
  status            ENUM('pending','reviewed','completed') NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id)  REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_prescriptions_patient (patient_id),
  KEY idx_prescriptions_target (target_id)
) ENGINE=InnoDB;

-- رسائل بين المريض والطبيب/الصيدلية (يمكن ربطها بروشتة معيّنة)
CREATE TABLE IF NOT EXISTS messages (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id         INT UNSIGNED NOT NULL,
  receiver_id       INT UNSIGNED NOT NULL,
  prescription_id   INT UNSIGNED NULL,
  message_text      TEXT NOT NULL,
  is_read           TINYINT(1) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL,
  KEY idx_messages_sender (sender_id),
  KEY idx_messages_receiver (receiver_id),
  KEY idx_messages_pair (sender_id, receiver_id, id)
) ENGINE=InnoDB;

-- لإنشاء أول حساب أدمن، لا تُدرج هاش كلمة مرور يدويًا هنا (لأن bcrypt يحتاج توليدًا حقيقيًا).
-- بدلاً من ذلك شغّل من طرفية السيرفر:
--   php backend/database/create_admin.php
-- وهذا السكربت سيطلب منك البريد وكلمة المرور ويُنشئ الحساب بهاش صحيح مباشرة في القاعدة.
