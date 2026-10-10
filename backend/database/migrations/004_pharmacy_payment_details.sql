-- بيانات التحويل البنكي للصيدلية (يراها المريض عند إتمام الشراء). شغّله مرة واحدة على قاعدة قائمة:
--   mysql -u root -p pharmacy_pro < backend/database/migrations/004_pharmacy_payment_details.sql

USE pharmacy_pro;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pharmacy_profiles' AND COLUMN_NAME = 'payment_details'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE pharmacy_profiles ADD COLUMN payment_details VARCHAR(255) NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
