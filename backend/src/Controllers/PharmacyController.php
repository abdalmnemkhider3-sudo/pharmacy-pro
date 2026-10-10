<?php

namespace Controllers;

use Support\Request;
use Support\Response;
use Support\Validator;
use Middleware\Auth;

class PharmacyController
{
    /** GET /api/pharmacy/profile — ملف الصيدلية صاحبة الجلسة */
    public static function profile(): void
    {
        $user = Auth::requireRole(['pharmacy']);
        $stmt = \Database::connection()->prepare(
            'SELECT u.id, u.full_name, u.phone, u.address, pp.pharmacy_name, pp.owner_name, pp.license_number, pp.payment_details
             FROM users u JOIN pharmacy_profiles pp ON pp.user_id = u.id WHERE u.id = ?'
        );
        $stmt->execute([$user['sub']]);
        Response::ok(['profile' => $stmt->fetch() ?: null]);
    }

    /** PUT /api/pharmacy/profile — تحديث بيانات التحويل البنكي التي تظهر للمريض عند الدفع */
    public static function updateProfile(): void
    {
        $user = Auth::requireRole(['pharmacy']);
        $data = Request::json();

        $errors = Validator::validate($data, ['payment_details' => 'max:255']);
        if ($errors) {
            Response::error('بيانات غير صحيحة.', 422, ['errors' => $errors]);
        }

        $details = trim((string) ($data['payment_details'] ?? ''));
        \Database::connection()
            ->prepare('UPDATE pharmacy_profiles SET payment_details = ? WHERE user_id = ?')
            ->execute([$details !== '' ? $details : null, $user['sub']]);

        Response::ok([], 'تم حفظ بيانات الدفع.');
    }
}
