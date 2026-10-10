<?php

namespace Controllers;

use Support\Request;
use Support\Response;
use Support\Validator;
use Middleware\Auth;

class MedicineController
{
    /** GET /api/medicines — استعراض/بحث عام (يتطلب تسجيل الدخول) */
    public static function index(): void
    {
        Auth::requireRole(['patient', 'doctor', 'pharmacy', 'delivery', 'admin']);
        $pdo = \Database::connection();

        $search = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
        $pharmacyId = (int) (is_string($_GET['pharmacy_id'] ?? null) ? $_GET['pharmacy_id'] : 0);

        $sql = 'SELECT m.*, u.full_name AS pharmacy_name, u.address AS pharmacy_address
                FROM medicines m JOIN users u ON u.id = m.pharmacy_id
                WHERE m.is_available = 1 AND m.quantity > 0
                  AND u.role = "pharmacy" AND u.status = "active" AND u.is_verified = 1';
        $params = [];

        if ($search !== '') {
            // نُهرّب % و _ حتى لا تُعامل كرموز بحث شاملة
            $sql .= ' AND m.medicine_name LIKE ?';
            $params[] = '%' . addcslashes($search, '%_\\') . '%';
        }
        if ($pharmacyId > 0) {
            $sql .= ' AND m.pharmacy_id = ?';
            $params[] = $pharmacyId;
        }
        $sql .= ' ORDER BY m.updated_at DESC LIMIT 100';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        Response::ok(['medicines' => $stmt->fetchAll()]);
    }

    /** GET /api/medicines/mine — مخزون الصيدلية صاحبة الجلسة */
    public static function mine(): void
    {
        $user = Auth::requireRole(['pharmacy']);
        $pdo = \Database::connection();

        $stmt = $pdo->prepare('SELECT * FROM medicines WHERE pharmacy_id = ? ORDER BY updated_at DESC');
        $stmt->execute([$user['sub']]);

        Response::ok(['medicines' => $stmt->fetchAll()]);
    }

    /** POST /api/medicines — إضافة دواء (صيدلية فقط) */
    public static function store(): void
    {
        $user = Auth::requireRole(['pharmacy']);
        $pdo = \Database::connection();
        $data = Request::json();

        $errors = Validator::validate($data, [
            'medicine_name' => 'required|max:150',
            'description'   => 'max:500',
            'price'         => 'required|numeric|gte:0|lte:99999999',
            'quantity'      => 'required|integer|gte:0|lte:1000000',
        ]);
        if ($errors) {
            Response::error('بيانات غير صحيحة.', 422, ['errors' => $errors]);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO medicines (pharmacy_id, medicine_name, description, price, quantity, is_available)
             VALUES (?, ?, ?, ?, ?, 1)'
        );
        $stmt->execute([
            $user['sub'],
            trim($data['medicine_name']),
            ($data['description'] ?? '') !== '' ? $data['description'] : null,
            round((float) $data['price'], 2),
            (int) $data['quantity'],
        ]);

        Response::created(['id' => (int) $pdo->lastInsertId()], 'تم إضافة الدواء إلى المخزون بنجاح.');
    }

    /** PUT /api/medicines/{id} — تعديل دواء (يجب أن يملكه نفس حساب الصيدلية) */
    public static function update(int $id): void
    {
        $user = Auth::requireRole(['pharmacy']);
        $pdo = \Database::connection();
        $data = Request::json();

        $owns = self::assertOwnership($pdo, $id, (int) $user['sub']);
        if (!$owns) {
            Response::error('هذا الدواء لا يخص صيدليتك.', 403);
        }

        // نتحقق فقط من الحقول المُرسلة (تعديل جزئي)، بنفس قواعد الإضافة
        $rules = [];
        foreach ([
            'medicine_name' => 'required|max:150',
            'description'   => 'max:500',
            'price'         => 'required|numeric|gte:0|lte:99999999',
            'quantity'      => 'required|integer|gte:0|lte:1000000',
        ] as $field => $rule) {
            if (array_key_exists($field, $data)) {
                $rules[$field] = $rule;
            }
        }
        $errors = Validator::validate($data, $rules);
        if ($errors) {
            Response::error('بيانات غير صحيحة.', 422, ['errors' => $errors]);
        }

        $stmt = $pdo->prepare(
            'UPDATE medicines SET medicine_name = ?, description = ?, price = ?, quantity = ?, is_available = ? WHERE id = ?'
        );
        $stmt->execute([
            isset($data['medicine_name']) ? trim($data['medicine_name']) : $owns['medicine_name'],
            array_key_exists('description', $data) ? (($data['description'] ?? '') !== '' ? $data['description'] : null) : $owns['description'],
            isset($data['price']) ? round((float) $data['price'], 2) : $owns['price'],
            isset($data['quantity']) ? (int) $data['quantity'] : $owns['quantity'],
            isset($data['is_available']) ? (int) filter_var($data['is_available'], FILTER_VALIDATE_BOOLEAN) : $owns['is_available'],
            $id,
        ]);

        Response::ok([], 'تم تحديث الدواء بنجاح.');
    }

    /** DELETE /api/medicines/{id} */
    public static function destroy(int $id): void
    {
        $user = Auth::requireRole(['pharmacy']);
        $pdo = \Database::connection();

        if (!self::assertOwnership($pdo, $id, (int) $user['sub'])) {
            Response::error('هذا الدواء لا يخص صيدليتك.', 403);
        }

        $pdo->prepare('DELETE FROM medicines WHERE id = ?')->execute([$id]);
        Response::ok([], 'تم حذف الدواء.');
    }

    private static function assertOwnership(\PDO $pdo, int $medicineId, int $pharmacyId): array|false
    {
        $stmt = $pdo->prepare('SELECT * FROM medicines WHERE id = ? AND pharmacy_id = ?');
        $stmt->execute([$medicineId, $pharmacyId]);
        return $stmt->fetch() ?: false;
    }
}
