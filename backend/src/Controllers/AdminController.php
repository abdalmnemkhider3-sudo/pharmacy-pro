<?php

namespace Controllers;

use Support\Db;
use Support\FileUpload;
use Support\Response;
use Support\Validator;
use Middleware\Auth;

class AdminController
{
    /** POST /api/admin/pharmacies — الأدمن ينشئ حساب صيدلية مباشرة، نشط وموثّق فورًا */
    public static function createPharmacy(): void
    {
        Auth::requireRole(['admin']);
        $pdo = \Database::connection();

        $errors = Validator::validate($_POST, [
            'pharmacy_name'  => 'required|max:150',
            'owner_name'     => 'required|max:150',
            'email'          => 'required|email|max:150',
            'phone'          => 'required|max:20',
            'address'        => 'required|max:255',
            'license_number' => 'max:100',
            'payment_details' => 'max:255',
            'password'       => 'min:8|max:72', // اختيارية؛ تُولَّد تلقائيًا إن تُركت فارغة
        ]);
        if ($errors) {
            Response::error('بيانات غير صحيحة.', 422, ['errors' => $errors]);
        }

        $email = strtolower(trim($_POST['email']));
        $phone = trim($_POST['phone']);

        $check = $pdo->prepare('SELECT id FROM users WHERE email = ? OR phone = ?');
        $check->execute([$email, $phone]);
        if ($check->fetch()) {
            Response::error('البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل.', 409);
        }

        // كلمة المرور تُحسم قبل رفع أي صورة، حتى لا يبقى ملف يتيم عند رفض الطلب
        $password = trim($_POST['password'] ?? '');
        $generatedPassword = null;
        if ($password === '') {
            $generatedPassword = bin2hex(random_bytes(5)); // 10 محارف
            $password = $generatedPassword;
        }

        // الصور اختيارية عند إنشاء الأدمن للحساب مباشرة
        $exteriorName = null;
        $interiorName = null;
        try {
            if (!empty($_FILES['exterior_image']['name'])) {
                $exteriorName = FileUpload::storeImage($_FILES['exterior_image'], 'pharmacy_ext');
            }
            if (!empty($_FILES['interior_image']['name'])) {
                $interiorName = FileUpload::storeImage($_FILES['interior_image'], 'pharmacy_int');
            }
        } catch (\RuntimeException $e) {
            FileUpload::delete($exteriorName);
            Response::error($e->getMessage(), 422);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'INSERT INTO users (full_name, email, phone, password_hash, role, status, is_verified, address)
                 VALUES (?, ?, ?, ?, "pharmacy", "active", 1, ?)'
            )->execute([
                trim($_POST['pharmacy_name']),
                $email,
                $phone,
                password_hash($password, PASSWORD_BCRYPT),
                trim($_POST['address']),
            ]);
            $userId = (int) $pdo->lastInsertId();

            $pdo->prepare(
                'INSERT INTO pharmacy_profiles (user_id, pharmacy_name, owner_name, license_number, exterior_image, interior_image, created_by_admin, payment_details)
                 VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
            )->execute([
                $userId,
                trim($_POST['pharmacy_name']),
                trim($_POST['owner_name']),
                ($_POST['license_number'] ?? '') !== '' ? $_POST['license_number'] : null,
                $exteriorName,
                $interiorName,
                trim($_POST['payment_details'] ?? '') !== '' ? trim($_POST['payment_details']) : null,
            ]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            FileUpload::delete($exteriorName);
            FileUpload::delete($interiorName);
            if (Db::isDuplicate($e)) {
                Response::error('البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل.', 409);
            }
            Response::error('تعذّر إنشاء حساب الصيدلية.', 500, ['detail' => APP_DEBUG ? $e->getMessage() : null]);
        }

        Response::created(
            ['user_id' => $userId, 'generated_password' => $generatedPassword],
            'تم إنشاء حساب الصيدلية وتفعيله وتوثيقه مباشرة.'
        );
    }

    /** GET /api/admin/pharmacies/pending — كل الصيدليات (المعلّقة أولًا) */
    public static function pendingPharmacies(): void
    {
        Auth::requireRole(['admin']);
        $pdo = \Database::connection();

        $stmt = $pdo->query(
            'SELECT u.id, u.full_name, u.email, u.phone, u.address, u.status, u.is_verified, u.created_at,
                    pp.pharmacy_name, pp.owner_name, pp.license_number, pp.exterior_image, pp.interior_image
             FROM users u JOIN pharmacy_profiles pp ON pp.user_id = u.id
             WHERE u.role = "pharmacy"
             ORDER BY (u.status = "pending_verification") DESC, u.created_at DESC'
        );

        Response::ok(['pharmacies' => $stmt->fetchAll()]);
    }

    /** GET /api/admin/users?role=&status= */
    public static function users(): void
    {
        Auth::requireRole(['admin']);
        $pdo = \Database::connection();

        $sql = 'SELECT id, full_name, email, phone, role, status, is_verified, created_at FROM users WHERE role != "admin"';
        $params = [];

        $role = $_GET['role'] ?? '';
        if (is_string($role) && in_array($role, ['patient', 'doctor', 'pharmacy', 'delivery'], true)) {
            $sql .= ' AND role = ?';
            $params[] = $role;
        }
        $status = $_GET['status'] ?? '';
        if (is_string($status) && in_array($status, ['pending_verification', 'active', 'blocked'], true)) {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY created_at DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        Response::ok(['users' => $stmt->fetchAll()]);
    }

    /** POST /api/admin/users/{id}/verify — يوثّق الحساب، ويفعّله فقط إن كان بانتظار المراجعة (لا يفكّ حظرًا) */
    public static function verify(int $id): void
    {
        Auth::requireRole(['admin']);
        $pdo = \Database::connection();
        self::targetOrFail($pdo, $id);

        $pdo->prepare(
            'UPDATE users SET is_verified = 1,
                    status = IF(status = "pending_verification", "active", status)
             WHERE id = ?'
        )->execute([$id]);
        Response::ok([], 'تم توثيق الحساب بنجاح.');
    }

    /** POST /api/admin/users/{id}/block */
    public static function block(int $id): void
    {
        $admin = Auth::requireRole(['admin']);
        $pdo = \Database::connection();
        self::targetOrFail($pdo, $id);

        if ($id === (int) $admin['sub']) {
            Response::error('لا يمكنك حظر حسابك أنت.', 422);
        }
        $pdo->prepare('UPDATE users SET status = "blocked" WHERE id = ?')->execute([$id]);
        Response::ok([], 'تم حظر الحساب.');
    }

    /** POST /api/admin/users/{id}/unblock — الصيدلية غير الموثّقة تعود إلى «قيد المراجعة» لا إلى «نشط» */
    public static function unblock(int $id): void
    {
        Auth::requireRole(['admin']);
        $pdo = \Database::connection();
        $target = self::targetOrFail($pdo, $id);

        if ($target['status'] !== 'blocked') {
            Response::error('هذا الحساب غير محظور.', 422);
        }
        $pdo->prepare(
            'UPDATE users SET status = IF(role = "pharmacy" AND is_verified = 0, "pending_verification", "active")
             WHERE id = ? AND status = "blocked"'
        )->execute([$id]);
        Response::ok([], 'تم إلغاء حظر الحساب.');
    }

    /** يرجع المستخدم الهدف، أو يقطع الطلب (404 غير موجود / 403 أدمن) — كانت العمليات تنجح صامتة على أي معرّف. */
    private static function targetOrFail(\PDO $pdo, int $id): array
    {
        $stmt = $pdo->prepare('SELECT id, role, status, is_verified FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $target = $stmt->fetch();

        if (!$target) {
            Response::error('المستخدم غير موجود.', 404);
        }
        if ($target['role'] === 'admin') {
            Response::error('لا يمكن تعديل حساب أدمن من هنا.', 403);
        }
        return $target;
    }
}
