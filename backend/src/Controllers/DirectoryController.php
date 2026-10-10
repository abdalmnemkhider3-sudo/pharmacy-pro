<?php

namespace Controllers;

use Support\Response;
use Middleware\Auth;

class DirectoryController
{
    /** GET /api/directory/pharmacies — صيدليات نشطة وموثّقة فقط (يتطلب تسجيل الدخول) */
    public static function pharmacies(): void
    {
        Auth::requireRole(['patient', 'doctor', 'pharmacy', 'delivery', 'admin']);
        $pdo = \Database::connection();
        $stmt = $pdo->query(
            'SELECT u.id, u.full_name, u.address, pp.pharmacy_name, pp.payment_details
             FROM users u JOIN pharmacy_profiles pp ON pp.user_id = u.id
             WHERE u.role = "pharmacy" AND u.status = "active" AND u.is_verified = 1
             ORDER BY pp.pharmacy_name'
        );
        Response::ok(['pharmacies' => $stmt->fetchAll()]);
    }

    /** GET /api/directory/doctors — أطباء نشطون فقط (يتطلب تسجيل الدخول) */
    public static function doctors(): void
    {
        Auth::requireRole(['patient', 'doctor', 'pharmacy', 'delivery', 'admin']);
        $pdo = \Database::connection();
        $stmt = $pdo->query(
            'SELECT u.id, u.full_name, dp.specialty, dp.clinic_address
             FROM users u JOIN doctor_profiles dp ON dp.user_id = u.id
             WHERE u.role = "doctor" AND u.status = "active"
             ORDER BY u.full_name'
        );
        Response::ok(['doctors' => $stmt->fetchAll()]);
    }

    /** GET /api/directory/deliveries — مندوبو توصيل نشطون (لاختيار الصيدلية مَن يوصّل الطلب) */
    public static function deliveries(): void
    {
        Auth::requireRole(['pharmacy', 'admin']);
        $pdo = \Database::connection();
        $stmt = $pdo->query(
            'SELECT u.id, u.full_name, u.phone, dp.vehicle_type, dp.service_area
             FROM users u JOIN delivery_profiles dp ON dp.user_id = u.id
             WHERE u.role = "delivery" AND u.status = "active"
             ORDER BY u.full_name'
        );
        Response::ok(['deliveries' => $stmt->fetchAll()]);
    }
}
