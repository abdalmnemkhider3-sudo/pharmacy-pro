-- فهرس يسرّع جلب المحادثات بين طرفين. شغّله فقط إذا كانت قاعدتك مُنشأة قبل إضافته إلى schema.sql:
--   mysql -u root -p pharmacy_pro < backend/database/migrations/003_messages_index.sql

USE pharmacy_pro;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_messages_pair'
);
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE messages ADD KEY idx_messages_pair (sender_id, receiver_id, id)',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
