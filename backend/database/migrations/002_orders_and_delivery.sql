-- شغّل هذا الملف فقط إذا كانت قاعدتك مُنشأة مسبقًا من نسخة أقدم من schema.sql
-- (تركيب جديد بالكامل يكفيه schema.sql وحده، ولا داعي لهذا الملف).
--   mysql -u root -p pharmacy_pro < backend/database/migrations/002_orders_and_delivery.sql

USE pharmacy_pro;

ALTER TABLE users
  MODIFY role ENUM('patient','doctor','pharmacy','delivery','admin') NOT NULL;

ALTER TABLE pharmacy_profiles
  MODIFY exterior_image VARCHAR(255) NULL,
  MODIFY interior_image VARCHAR(255) NULL;

-- ADD COLUMN IF NOT EXISTS مدعومة في MariaDB فقط وليس MySQL 8، لذا نفحص information_schema يدويًا (يعمل على الاثنين)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pharmacy_profiles' AND COLUMN_NAME = 'created_by_admin'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE pharmacy_profiles ADD COLUMN created_by_admin TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS delivery_profiles (
  user_id           INT UNSIGNED PRIMARY KEY,
  vehicle_type      VARCHAR(60)   NULL,
  service_area      VARCHAR(150)  NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id          INT UNSIGNED NOT NULL,
  pharmacy_id         INT UNSIGNED NOT NULL,
  delivery_id         INT UNSIGNED NULL,
  status              ENUM(
                        'payment_review','payment_rejected','preparing',
                        'out_for_delivery','delivered','cancelled'
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
