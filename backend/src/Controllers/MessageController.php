<?php

namespace Controllers;

use Support\Request;
use Support\Response;
use Support\Validator;
use Middleware\Auth;

class MessageController
{
    private const ROLES = ['patient', 'doctor', 'pharmacy', 'delivery', 'admin'];

    /** POST /api/messages */
    public static function send(): void
    {
        $user = Auth::requireRole(self::ROLES);
        $pdo = \Database::connection();
        $data = Request::json();

        $errors = Validator::validate($data, [
            'receiver_id'     => 'required|integer|gte:1',
            'message_text'    => 'required|max:2000',
            'prescription_id' => 'integer|gte:1',
        ]);
        if ($errors) {
            Response::error('بيانات غير صحيحة.', 422, ['errors' => $errors]);
        }

        $receiverId = (int) $data['receiver_id'];
        $me = (int) $user['sub'];
        if ($receiverId === $me) {
            Response::error('لا يمكنك إرسال رسالة إلى نفسك.', 422);
        }

        $receiverCheck = $pdo->prepare('SELECT id FROM users WHERE id = ? AND status = "active"');
        $receiverCheck->execute([$receiverId]);
        if (!$receiverCheck->fetch()) {
            Response::error('المستلم غير موجود.', 404);
        }

        // الروشتة المرتبطة يجب أن تكون بين هذين الطرفين بالذات (كان معرّف خاطئ يسبب خطأ 500)
        $prescriptionId = null;
        if (($data['prescription_id'] ?? '') !== '') {
            $rx = $pdo->prepare(
                'SELECT id FROM prescriptions
                 WHERE id = ? AND ((patient_id = ? AND target_id = ?) OR (patient_id = ? AND target_id = ?))'
            );
            $rx->execute([(int) $data['prescription_id'], $me, $receiverId, $receiverId, $me]);
            if (!$rx->fetch()) {
                Response::error('الروشتة المرتبطة غير موجودة.', 404);
            }
            $prescriptionId = (int) $data['prescription_id'];
        }

        $stmt = $pdo->prepare(
            'INSERT INTO messages (sender_id, receiver_id, prescription_id, message_text) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$me, $receiverId, $prescriptionId, trim($data['message_text'])]);

        Response::created(['id' => (int) $pdo->lastInsertId()], 'تم إرسال الرسالة.');
    }

    /** GET /api/messages/thread?with=ID — محادثة كاملة مع مستخدم آخر (وتُعلَّم رسائله كمقروءة) */
    public static function thread(): void
    {
        $user = Auth::requireRole(self::ROLES);
        $pdo = \Database::connection();
        $otherId = (int) (is_string($_GET['with'] ?? null) ? $_GET['with'] : 0);

        if ($otherId <= 0) {
            Response::error('يرجى تحديد الطرف الآخر للمحادثة.', 422);
        }

        $otherStmt = $pdo->prepare('SELECT id, full_name, role FROM users WHERE id = ?');
        $otherStmt->execute([$otherId]);
        $other = $otherStmt->fetch();
        if (!$other) {
            Response::error('المستخدم غير موجود.', 404);
        }

        $stmt = $pdo->prepare(
            'SELECT * FROM messages
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_at ASC, id ASC'
        );
        $stmt->execute([$user['sub'], $otherId, $otherId, $user['sub']]);
        $messages = $stmt->fetchAll();

        $pdo->prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0')
            ->execute([$otherId, $user['sub']]);

        Response::ok(['messages' => $messages, 'with' => $other]);
    }

    /** GET /api/messages/conversations — قائمة كل المحادثات مع آخر رسالة وعدد غير المقروء */
    public static function conversations(): void
    {
        $user = Auth::requireRole(self::ROLES);
        $pdo = \Database::connection();
        $me = $user['sub'];

        $sql = 'SELECT other.id AS user_id, other.full_name, other.role,
                       lm.message_text AS last_message, lm.created_at AS last_at, lm.sender_id AS last_sender_id,
                       (SELECT COUNT(*) FROM messages m2 WHERE m2.sender_id = other.id AND m2.receiver_id = ? AND m2.is_read = 0) AS unread_count
                FROM (
                    SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id, MAX(id) AS last_msg_id
                    FROM messages WHERE sender_id = ? OR receiver_id = ?
                    GROUP BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
                ) t
                JOIN messages lm ON lm.id = t.last_msg_id
                JOIN users other ON other.id = t.other_id
                ORDER BY lm.id DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$me, $me, $me, $me, $me]);

        Response::ok(['conversations' => $stmt->fetchAll()]);
    }
}
