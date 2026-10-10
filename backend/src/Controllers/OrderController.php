<?php

namespace Controllers;

use Support\FileUpload;
use Support\Request;
use Support\Response;
use Support\Validator;
use Middleware\Auth;

class OrderController
{
    private const MAX_LINES = 50;
    private const MAX_QTY_PER_LINE = 1000;

    /**
     * POST /api/orders — المريض ينشئ طلب شراء من صيدلية واحدة، مع إيصال تحويل (multipart/form-data)
     * الحقول: pharmacy_id, delivery_address, notes, items (JSON نصي: [{medicine_id, quantity}, ...]), payment_proof_image
     */
    public static function store(): void
    {
        $user = Auth::requireRole(['patient']);
        $pdo = \Database::connection();

        $errors = Validator::validate($_POST, [
            'pharmacy_id'      => 'required|integer|gte:1',
            'delivery_address' => 'required|max:255',
            'notes'            => 'max:500',
        ]);

        // items: نص JSON يجب أن يكون مصفوفة عناصر، ونجمّع العناصر المكررة لنفس الدواء
        $rawItems = is_string($_POST['items'] ?? null) ? json_decode($_POST['items'], true) : null;
        $merged = [];
        if (!is_array($rawItems) || count($rawItems) === 0) {
            $errors[] = 'السلة فارغة.';
        } elseif (count($rawItems) > self::MAX_LINES) {
            $errors[] = 'عدد عناصر السلة كبير جدًا.';
        } else {
            foreach ($rawItems as $item) {
                $medicineId = is_array($item) ? (int) ($item['medicine_id'] ?? 0) : 0;
                $quantity = is_array($item) ? (int) ($item['quantity'] ?? 0) : 0;
                if ($medicineId <= 0 || $quantity <= 0 || $quantity > self::MAX_QTY_PER_LINE) {
                    $errors[] = 'عنصر غير صحيح في السلة.';
                    break;
                }
                $merged[$medicineId] = ($merged[$medicineId] ?? 0) + $quantity;
            }
        }
        if (empty($_FILES['payment_proof_image']['name'])) {
            $errors[] = 'يرجى إرفاق صورة إيصال التحويل لتأكيد الدفع.';
        }
        if ($errors) {
            Response::error('بيانات غير صحيحة.', 422, ['errors' => $errors]);
        }

        $pharmacyId = (int) $_POST['pharmacy_id'];
        $pharmacyCheck = $pdo->prepare(
            'SELECT id FROM users WHERE id = ? AND role = "pharmacy" AND status = "active" AND is_verified = 1'
        );
        $pharmacyCheck->execute([$pharmacyId]);
        if (!$pharmacyCheck->fetch()) {
            Response::error('الصيدلية غير موجودة أو غير نشطة.', 404);
        }

        try {
            $proofName = FileUpload::storeImage($_FILES['payment_proof_image'], 'payment');
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }

        // نقفل الصفوف بترتيب معرّف الدواء دائمًا لتفادي التعارض (deadlock) بين طلبين متزامنين
        ksort($merged);

        $pdo->beginTransaction();
        try {
            $orderItems = [];
            $total = 0.0;
            $medStmt = $pdo->prepare(
                'SELECT * FROM medicines WHERE id = ? AND pharmacy_id = ? AND is_available = 1 FOR UPDATE'
            );
            foreach ($merged as $medicineId => $quantity) {
                $medStmt->execute([$medicineId, $pharmacyId]);
                $medicine = $medStmt->fetch();
                if (!$medicine) {
                    throw new \RuntimeException('أحد الأدوية في السلة لم يعد متوفرًا في هذه الصيدلية.');
                }
                if ($quantity > (int) $medicine['quantity']) {
                    throw new \RuntimeException("الكمية المطلوبة من «{$medicine['medicine_name']}» تتجاوز المتوفر.");
                }
                $total += (float) $medicine['price'] * $quantity;
                $orderItems[] = [
                    'medicine_id'   => $medicineId,
                    'medicine_name' => $medicine['medicine_name'],
                    'unit_price'    => $medicine['price'],
                    'quantity'      => $quantity,
                ];
            }

            $pdo->prepare(
                'INSERT INTO orders (patient_id, pharmacy_id, status, total_amount, delivery_address, payment_proof_image, notes)
                 VALUES (?, ?, "payment_review", ?, ?, ?, ?)'
            )->execute([
                $user['sub'],
                $pharmacyId,
                round($total, 2),
                trim($_POST['delivery_address']),
                $proofName,
                ($_POST['notes'] ?? '') !== '' ? $_POST['notes'] : null,
            ]);
            $orderId = (int) $pdo->lastInsertId();

            $itemStmt = $pdo->prepare(
                'INSERT INTO order_items (order_id, medicine_id, medicine_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)'
            );
            // ننقص الكمية فقط. لا نلمس is_available: القائمة العامة تُخفي أصلًا ما كميته صفر،
            // وكان تعديله هنا يُخفي الدواء خطأً حتى لو بقيت كمية (وتُلغي إخفاءات الصيدلية اليدوية).
            $stockStmt = $pdo->prepare('UPDATE medicines SET quantity = quantity - ? WHERE id = ? AND quantity >= ?');
            foreach ($orderItems as $oi) {
                $itemStmt->execute([$orderId, $oi['medicine_id'], $oi['medicine_name'], $oi['unit_price'], $oi['quantity']]);
                $stockStmt->execute([$oi['quantity'], $oi['medicine_id'], $oi['quantity']]);
                if ($stockStmt->rowCount() === 0) {
                    throw new \RuntimeException("الكمية المطلوبة من «{$oi['medicine_name']}» تتجاوز المتوفر.");
                }
            }

            $pdo->commit();
        } catch (\RuntimeException $e) {
            $pdo->rollBack();
            FileUpload::delete($proofName); // لا نترك إيصالًا يتيمًا لطلب لم يُنشأ
            Response::error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            FileUpload::delete($proofName);
            Response::error('تعذّر إنشاء الطلب.', 500, ['detail' => APP_DEBUG ? $e->getMessage() : null]);
        }

        Response::created(['id' => $orderId, 'total_amount' => round($total, 2)], 'تم إرسال طلبك، بانتظار مراجعة الصيدلية لإيصال التحويل.');
    }

    /** GET /api/orders/mine — طلبات المريض صاحب الجلسة */
    public static function mine(): void
    {
        $user = Auth::requireRole(['patient']);
        Response::ok(['orders' => self::fetchOrders(\Database::connection(), 'o.patient_id = ?', [$user['sub']])]);
    }

    /** GET /api/orders/incoming — طلبات واردة لصيدلية */
    public static function incoming(): void
    {
        $user = Auth::requireRole(['pharmacy']);
        Response::ok(['orders' => self::fetchOrders(\Database::connection(), 'o.pharmacy_id = ?', [$user['sub']])]);
    }

    /** GET /api/orders/assigned — طلبات مُسندة لمندوب توصيل */
    public static function assigned(): void
    {
        $user = Auth::requireRole(['delivery']);
        Response::ok(['orders' => self::fetchOrders(\Database::connection(), 'o.delivery_id = ?', [$user['sub']])]);
    }

    /**
     * PATCH /api/orders/{id}/status — تحديث حالة الطلب من طرف الصيدلية (تأكيد/رفض الدفع، تجهيز، إسناد توصيل)
     * أو من طرف مندوب التوصيل (تسليم).
     * كل انتقال يُنفَّذ بـ UPDATE مشروط بالحالة السابقة، فلا يمكن لطلبين متزامنين
     * (مثلًا ضغطتا «رفض» معًا) أن يعيدا المخزون مرتين.
     */
    public static function updateStatus(int $id): void
    {
        $user = Auth::requireRole(['pharmacy', 'delivery']);
        $pdo = \Database::connection();
        $data = Request::json();
        $status = is_string($data['status'] ?? null) ? $data['status'] : '';

        $orderStmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $orderStmt->execute([$id]);
        $order = $orderStmt->fetch();
        if (!$order) {
            Response::error('الطلب غير موجود.', 404);
        }

        $conflict = 'تغيّرت حالة الطلب للتو، حدّث الصفحة وحاول مجددًا.';

        if ($user['role'] === 'pharmacy') {
            if ((int) $order['pharmacy_id'] !== (int) $user['sub']) {
                Response::error('هذا الطلب لا يخص صيدليتك.', 403);
            }
            $allowed = [
                'payment_review'   => ['preparing', 'payment_rejected'],
                'preparing'        => ['out_for_delivery'],
                'out_for_delivery' => ['delivered'], // تسليم ذاتي بدون مندوب
            ];
            if (!in_array($status, $allowed[$order['status']] ?? [], true)) {
                Response::error('لا يمكن الانتقال من الحالة الحالية إلى هذه الحالة.', 422);
            }

            $deliveryId = null;
            if ($status === 'out_for_delivery' && !empty($data['delivery_id'])) {
                $deliveryCheck = $pdo->prepare('SELECT id FROM users WHERE id = ? AND role = "delivery" AND status = "active"');
                $deliveryCheck->execute([(int) $data['delivery_id']]);
                if (!$deliveryCheck->fetch()) {
                    Response::error('مندوب التوصيل غير موجود أو غير نشط.', 404);
                }
                $deliveryId = (int) $data['delivery_id'];
            }

            if ($status === 'payment_rejected') {
                $reason = is_string($data['rejection_reason'] ?? null) ? trim($data['rejection_reason']) : '';
                $reason = $reason !== '' ? mb_substr($reason, 0, 255) : 'لم يتم التحقق من الدفع.';

                $pdo->beginTransaction();
                try {
                    $upd = $pdo->prepare('UPDATE orders SET status = "payment_rejected", rejection_reason = ? WHERE id = ? AND status = "payment_review"');
                    $upd->execute([$reason, $id]);
                    if ($upd->rowCount() === 0) {
                        $pdo->rollBack();
                        Response::error($conflict, 409);
                    }
                    self::restoreStock($pdo, $id);
                    $pdo->commit();
                } catch (\Throwable $e) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    Response::error('تعذّر رفض الطلب.', 500, ['detail' => APP_DEBUG ? $e->getMessage() : null]);
                }
            } else {
                $sql = 'UPDATE orders SET status = ?' . ($deliveryId ? ', delivery_id = ?' : '') . ' WHERE id = ? AND status = ?';
                $params = $deliveryId ? [$status, $deliveryId, $id, $order['status']] : [$status, $id, $order['status']];
                $upd = $pdo->prepare($sql);
                $upd->execute($params);
                if ($upd->rowCount() === 0) {
                    Response::error($conflict, 409);
                }
            }
        } else { // delivery
            if ((int) $order['delivery_id'] !== (int) $user['sub']) {
                Response::error('هذا الطلب غير مُسند إليك.', 403);
            }
            if ($order['status'] !== 'out_for_delivery' || $status !== 'delivered') {
                Response::error('لا يمكن تنفيذ هذا الإجراء على الطلب في حالته الحالية.', 422);
            }
            $upd = $pdo->prepare('UPDATE orders SET status = "delivered" WHERE id = ? AND status = "out_for_delivery" AND delivery_id = ?');
            $upd->execute([$id, $user['sub']]);
            if ($upd->rowCount() === 0) {
                Response::error($conflict, 409);
            }
        }

        Response::ok([], 'تم تحديث حالة الطلب.');
    }

    private static function fetchOrders(\PDO $pdo, string $where, array $params): array
    {
        $stmt = $pdo->prepare(
            "SELECT o.*, p.full_name AS patient_name, p.phone AS patient_phone,
                    ph.full_name AS pharmacy_name, d.full_name AS delivery_name, d.phone AS delivery_phone
             FROM orders o
             JOIN users p ON p.id = o.patient_id
             JOIN users ph ON ph.id = o.pharmacy_id
             LEFT JOIN users d ON d.id = o.delivery_id
             WHERE $where
             ORDER BY o.created_at DESC, o.id DESC"
        );
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        if (!$orders) {
            return [];
        }

        $ids = array_column($orders, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $itemsStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ($placeholders)");
        $itemsStmt->execute($ids);
        $itemsByOrder = [];
        foreach ($itemsStmt->fetchAll() as $item) {
            $itemsByOrder[$item['order_id']][] = $item;
        }

        foreach ($orders as &$order) {
            $order['items'] = $itemsByOrder[$order['id']] ?? [];
        }
        unset($order);

        return $orders;
    }

    /** إعادة الكميات للمخزون عند رفض إيصال التحويل (لا تغيّر حالة الإخفاء اليدوي للدواء) */
    private static function restoreStock(\PDO $pdo, int $orderId): void
    {
        $itemsStmt = $pdo->prepare('SELECT medicine_id, quantity FROM order_items WHERE order_id = ? AND medicine_id IS NOT NULL');
        $itemsStmt->execute([$orderId]);
        $restore = $pdo->prepare('UPDATE medicines SET quantity = quantity + ? WHERE id = ?');
        foreach ($itemsStmt->fetchAll() as $item) {
            $restore->execute([(int) $item['quantity'], (int) $item['medicine_id']]);
        }
    }
}
