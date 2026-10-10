<?php

namespace Support;

/**
 * يحدّد مَن يحق له رؤية كل ملف مرفوع.
 * لا يكفي أن يكون المستخدم مسجّل الدخول: إيصال التحويل وصورة الروشتة بيانات حساسة
 * ويجب أن يراها أصحابها فقط (والأدمن).
 */
class FileAccess
{
    public static function canView(\PDO $pdo, array $user, string $filename): bool
    {
        if ($user['role'] === 'admin') {
            return true;
        }
        $uid = (int) $user['sub'];

        if (str_starts_with($filename, 'payment_')) {
            // إيصال التحويل: المريض صاحب الطلب والصيدلية المستلمة فقط
            $stmt = $pdo->prepare(
                'SELECT 1 FROM orders WHERE payment_proof_image = ? AND (patient_id = ? OR pharmacy_id = ?) LIMIT 1'
            );
            $stmt->execute([$filename, $uid, $uid]);
            return (bool) $stmt->fetchColumn();
        }

        if (str_starts_with($filename, 'rx_')) {
            // صورة الروشتة: المريض صاحبها والجهة (صيدلية/طبيب) التي أُرسلت إليها
            $stmt = $pdo->prepare(
                'SELECT 1 FROM prescriptions WHERE image_path = ? AND (patient_id = ? OR target_id = ?) LIMIT 1'
            );
            $stmt->execute([$filename, $uid, $uid]);
            return (bool) $stmt->fetchColumn();
        }

        if (str_starts_with($filename, 'pharmacy_ext_') || str_starts_with($filename, 'pharmacy_int_')) {
            // صور الصيدلية (للتوثيق): صاحبة الحساب فقط
            $stmt = $pdo->prepare(
                'SELECT 1 FROM pharmacy_profiles WHERE user_id = ? AND (exterior_image = ? OR interior_image = ?) LIMIT 1'
            );
            $stmt->execute([$uid, $filename, $filename]);
            return (bool) $stmt->fetchColumn();
        }

        return false;
    }
}
