<?php

namespace Middleware;

use Support\Jwt;
use Support\Response;

class Auth
{
    /**
     * يرجع بيانات المستخدم، أو يقطع الطلب بخطأ 401.
     * لا نكتفي بصلاحية التوكن: نتحقق من قاعدة البيانات في كل طلب كي يسري الحظر
     * وتغيير الدور فورًا (كان التوكن يبقى صالحًا 12 ساعة حتى بعد حظر الحساب).
     * التوكن يُقبل من رأس Authorization فقط (وليس من الـ URL حتى لا يتسرّب في السجلات).
     */
    public static function user(): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!$header && function_exists('apache_request_headers')) {
            foreach (apache_request_headers() as $key => $val) {
                if (strcasecmp($key, 'Authorization') === 0) {
                    $header = $val;
                    break;
                }
            }
        }

        $token = preg_match('/^Bearer\s+(\S+)$/i', trim($header), $m) ? $m[1] : null;
        if (!$token) {
            Response::error('يجب تسجيل الدخول للوصول إلى هذا المورد.', 401);
        }

        $payload = Jwt::verify($token);
        if (!$payload) {
            Response::error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا.', 401);
        }

        $stmt = \Database::connection()->prepare('SELECT id, role, status, full_name FROM users WHERE id = ?');
        $stmt->execute([(int) $payload['sub']]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('الحساب غير موجود.', 401);
        }
        if ($row['status'] === 'blocked') {
            Response::error('هذا الحساب محظور. تواصل مع الإدارة.', 401);
        }
        if ($row['status'] === 'pending_verification') {
            Response::error('حسابك قيد المراجعة والموافقة من الإدارة حاليًا.', 401);
        }

        // الدور يُؤخذ من القاعدة وليس من التوكن
        return ['sub' => (int) $row['id'], 'role' => $row['role'], 'name' => $row['full_name']];
    }

    /** مثل user() لكنها تتأكد أيضًا أن دور المستخدم ضمن الأدوار المسموحة. */
    public static function requireRole(array $roles): array
    {
        $user = self::user();
        if (!in_array($user['role'], $roles, true)) {
            Response::error('غير مصرح لك بتنفيذ هذا الإجراء.', 403);
        }
        return $user;
    }
}
