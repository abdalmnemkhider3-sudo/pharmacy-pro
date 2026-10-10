<?php

namespace Controllers;

use Support\FileUpload;
use Support\Request;
use Support\Response;
use Support\Validator;
use Middleware\Auth;

class PrescriptionController
{
    /** POST /api/prescriptions — رفع روشتة (مريض فقط، multipart/form-data) */
    public static function store(): void
    {
        $user = Auth::requireRole(['patient']);
        $pdo = \Database::connection();

        $errors = Validator::validate($_POST, [
            'target_role' => 'required|in:pharmacy,doctor',
            'target_id'   => 'required|integer|gte:1',
            'notes'       => 'max:500',
        ]);
        if (empty($_FILES['prescription_image']['name'])) {
            $errors[] = 'صورة الروشتة مطلوبة.';
        }
        if ($errors) {
            Response::error('بيانات غير صحيحة.', 422, ['errors' => $errors]);
        }

        // الصيدلية يجب أن تكون موثّقة أيضًا (كان يكفي أن تكون «نشطة»)
        $verifiedClause = $_POST['target_role'] === 'pharmacy' ? ' AND is_verified = 1' : '';
        $targetCheck = $pdo->prepare('SELECT id FROM users WHERE id = ? AND role = ? AND status = "active"' . $verifiedClause);
        $targetCheck->execute([(int) $_POST['target_id'], $_POST['target_role']]);
        if (!$targetCheck->fetch()) {
            Response::error('الجهة المستلمة غير موجودة أو غير نشطة.', 404);
        }

        try {
            $filename = FileUpload::storeImage($_FILES['prescription_image'], 'rx');
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO prescriptions (patient_id, target_role, target_id, image_path, notes, status)
                 VALUES (?, ?, ?, ?, ?, "pending")'
            );
            $stmt->execute([
                $user['sub'],
                $_POST['target_role'],
                (int) $_POST['target_id'],
                $filename,
                ($_POST['notes'] ?? '') !== '' ? $_POST['notes'] : null,
            ]);
        } catch (\Throwable $e) {
            FileUpload::delete($filename);
            Response::error('تعذّر حفظ الروشتة.', 500, ['detail' => APP_DEBUG ? $e->getMessage() : null]);
        }

        Response::created(['id' => (int) $pdo->lastInsertId()], 'تم إرسال الروشتة بنجاح.');
    }

    /** GET /api/prescriptions/mine — روشتات المريض صاحب الجلسة */
    public static function mine(): void
    {
        $user = Auth::requireRole(['patient']);
        $pdo = \Database::connection();

        $stmt = $pdo->prepare(
            'SELECT p.*, u.full_name AS target_name FROM prescriptions p
             JOIN users u ON u.id = p.target_id
             WHERE p.patient_id = ? ORDER BY p.created_at DESC'
        );
        $stmt->execute([$user['sub']]);

        Response::ok(['prescriptions' => $stmt->fetchAll()]);
    }

    /** GET /api/prescriptions/incoming — الروشتات الواردة لصيدلية أو طبيب */
    public static function incoming(): void
    {
        $user = Auth::requireRole(['pharmacy', 'doctor']);
        $pdo = \Database::connection();

        $stmt = $pdo->prepare(
            'SELECT p.*, u.full_name AS patient_name, u.phone AS patient_phone FROM prescriptions p
             JOIN users u ON u.id = p.patient_id
             WHERE p.target_id = ? AND p.target_role = ? ORDER BY p.created_at DESC'
        );
        $stmt->execute([$user['sub'], $user['role']]);

        Response::ok(['prescriptions' => $stmt->fetchAll()]);
    }

    /** PATCH /api/prescriptions/{id}/status — تحديث حالة الروشتة (الجهة المستلمة فقط) */
    public static function updateStatus(int $id): void
    {
        $user = Auth::requireRole(['pharmacy', 'doctor']);
        $pdo = \Database::connection();
        $data = Request::json();

        $errors = Validator::validate($data, ['status' => 'required|in:pending,reviewed,completed']);
        if ($errors) {
            Response::error('حالة غير صحيحة.', 422, ['errors' => $errors]);
        }

        $stmt = $pdo->prepare('SELECT id FROM prescriptions WHERE id = ? AND target_id = ? AND target_role = ?');
        $stmt->execute([$id, $user['sub'], $user['role']]);
        if (!$stmt->fetch()) {
            Response::error('هذه الروشتة ليست موجّهة إليك.', 403);
        }

        $pdo->prepare('UPDATE prescriptions SET status = ? WHERE id = ?')->execute([$data['status'], $id]);
        Response::ok([], 'تم تحديث حالة الروشتة.');
    }
}
