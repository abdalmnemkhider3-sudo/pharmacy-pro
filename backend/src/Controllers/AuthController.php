<?php

namespace Controllers;

use Support\Db;
use Support\FileUpload;
use Support\Jwt;
use Support\Request;
use Support\Response;
use Support\Validator;
use Middleware\Auth;

class AuthController
{
    /** POST /api/auth/register — تسجيل مريض أو طبيب أو مندوب توصيل */
    public static function register(): void
    {
        $pdo = \Database::connection();
        $data = Request::json();

        $errors = Validator::validate($data, [
            'full_name'      => 'required|max:150',
            'email'          => 'required|email|max:150',
            'phone'          => 'required|max:20',
            'password'       => 'required|min:8|max:72',
            'role'           => 'required|in:patient,doctor,delivery',
            'specialty'      => 'max:120',
            'license_number' => 'max:100',
            'payment_details' => 'max:255',
            'clinic_address' => 'max:255',
            'vehicle_type'   => 'max:60',
            'service_area'   => 'max:150',
        ]);
        if ($errors) {
            Response::error('بيانات غير صحيحة.', 422, ['errors' => $errors]);
        }

        $email = strtolower(trim($data['email']));
        $phone = trim($data['phone']);

        $check = $pdo->prepare('SELECT id FROM users WHERE email = ? OR phone = ?');
        $check->execute([$email, $phone]);
        if ($check->fetch()) {
            Response::error('البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل.', 409);
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO users (full_name, email, phone, password_hash, role, status, is_verified)
                 VALUES (?, ?, ?, ?, ?, "active", 0)'
            );
            $stmt->execute([
                trim($data['full_name']),
                $email,
                $phone,
                password_hash($data['password'], PASSWORD_BCRYPT),
                $data['role'],
            ]);
            $userId = (int) $pdo->lastInsertId();

            if ($data['role'] === 'doctor') {
                $pdo->prepare(
                    'INSERT INTO doctor_profiles (user_id, specialty, license_number, clinic_address) VALUES (?, ?, ?, ?)'
                )->execute([
                    $userId,
                    ($data['specialty'] ?? '') !== '' ? $data['specialty'] : null,
                    ($data['license_number'] ?? '') !== '' ? $data['license_number'] : null,
                    ($data['clinic_address'] ?? '') !== '' ? $data['clinic_address'] : null,
                ]);
            }

            if ($data['role'] === 'delivery') {
                $pdo->prepare(
                    'INSERT INTO delivery_profiles (user_id, vehicle_type, service_area) VALUES (?, ?, ?)'
                )->execute([
                    $userId,
                    ($data['vehicle_type'] ?? '') !== '' ? $data['vehicle_type'] : null,
                    ($data['service_area'] ?? '') !== '' ? $data['service_area'] : null,
                ]);
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            if (Db::isDuplicate($e)) {
                Response::error('البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل.', 409);
            }
            Response::error('تعذّر إنشاء الحساب.', 500, ['detail' => APP_DEBUG ? $e->getMessage() : null]);
        }

        Response::created(['user_id' => $userId], 'تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.');
    }

    /** POST /api/auth/register-pharmacy — تسجيل صيدلية (multipart/form-data مع صورتين) */
    public static function registerPharmacy(): void
    {
        $pdo = \Database::connection();

        $errors = Validator::validate($_POST, [
            'pharmacy_name'  => 'required|max:150',
            'owner_name'     => 'required|max:150',
            'email'          => 'required|email|max:150',
            'phone'          => 'required|max:20',
            'address'        => 'required|max:255',
            'password'       => 'required|min:8|max:72',
            'license_number' => 'max:100',
        ]);
        if (empty($_FILES['exterior_image']['name']) || empty($_FILES['interior_image']['name'])) {
            $errors[] = 'صورتا واجهة وداخل الصيدلية مطلوبتان.';
        }
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

        $exteriorName = null;
        $interiorName = null;
        try {
            $exteriorName = FileUpload::storeImage($_FILES['exterior_image'], 'pharmacy_ext');
            $interiorName = FileUpload::storeImage($_FILES['interior_image'], 'pharmacy_int');
        } catch (\RuntimeException $e) {
            FileUpload::delete($exteriorName); // لا نترك الصورة الأولى يتيمة إن فشلت الثانية
            Response::error($e->getMessage(), 422);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'INSERT INTO users (full_name, email, phone, password_hash, role, status, is_verified, address)
                 VALUES (?, ?, ?, ?, "pharmacy", "pending_verification", 0, ?)'
            )->execute([
                trim($_POST['pharmacy_name']),
                $email,
                $phone,
                password_hash($_POST['password'], PASSWORD_BCRYPT),
                trim($_POST['address']),
            ]);
            $userId = (int) $pdo->lastInsertId();

            $pdo->prepare(
                'INSERT INTO pharmacy_profiles (user_id, pharmacy_name, owner_name, license_number, exterior_image, interior_image, payment_details)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
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
            Response::error('تعذّر إنشاء طلب الصيدلية.', 500, ['detail' => APP_DEBUG ? $e->getMessage() : null]);
        }

        Response::created([], 'تم إرسال طلب تسجيل الصيدلية، وهو الآن قيد مراجعة الإدارة.');
    }

    /** POST /api/auth/login */
    public static function login(): void
    {
        $pdo = \Database::connection();
        $data = Request::json();

        $errors = Validator::validate($data, ['email' => 'required|email', 'password' => 'required']);
        if ($errors) {
            Response::error('يرجى كتابة البريد الإلكتروني وكلمة المرور.', 422, ['errors' => $errors]);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([strtolower(trim($data['email']))]);
        $user = $stmt->fetch();

        if (!$user || !password_verify((string) $data['password'], $user['password_hash'])) {
            Response::error('البريد الإلكتروني أو كلمة المرور غير صحيحة.', 401);
        }
        if ($user['status'] === 'blocked') {
            Response::error('هذا الحساب محظور. تواصل مع الإدارة.', 403);
        }
        if ($user['status'] === 'pending_verification') {
            Response::error('حسابك قيد المراجعة والموافقة من الإدارة حاليًا.', 403);
        }

        $token = Jwt::issue([
            'sub'  => (int) $user['id'],
            'role' => $user['role'],
            'name' => $user['full_name'],
        ], JWT_TTL_HOURS);

        unset($user['password_hash']);

        Response::ok(['token' => $token, 'user' => $user], 'تم تسجيل الدخول بنجاح.');
    }

    /** GET /api/auth/me — بيانات المستخدم الحالي (Auth::user يتحقق من الحظر/المراجعة) */
    public static function me(): void
    {
        $tokenUser = Auth::user();
        $pdo = \Database::connection();

        $stmt = $pdo->prepare(
            'SELECT id, full_name, email, phone, role, status, is_verified, address, created_at FROM users WHERE id = ?'
        );
        $stmt->execute([$tokenUser['sub']]);

        Response::ok(['user' => $stmt->fetch()]);
    }
}
