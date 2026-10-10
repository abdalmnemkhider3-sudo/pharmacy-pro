<?php
/**
 * سكربت طرفية لإنشاء أول حساب أدمن.
 * الاستخدام (من مجلد backend):
 *   php database/create_admin.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

function prompt(string $label, bool $hidden = false): string
{
    echo $label;
    if ($hidden && stripos(PHP_OS, 'WIN') === false && function_exists('posix_isatty') && posix_isatty(STDIN)) {
        system('stty -echo');
        $value = trim((string) fgets(STDIN));
        system('stty echo');
        echo "\n";
        return $value;
    }
    return trim((string) fgets(STDIN));
}

$fullName = prompt('الاسم الكامل: ');
$email    = prompt('البريد الإلكتروني: ');
$phone    = prompt('رقم الهاتف: ');
$password = prompt('كلمة المرور: ', true);

$email = strtolower($email);
if ($fullName === '' || $phone === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "الاسم والهاتف مطلوبان، والبريد الإلكتروني يجب أن يكون صحيحًا.\n");
    exit(1);
}

if (mb_strlen($password) < 8 || mb_strlen($password) > 72) {
    fwrite(STDERR, "كلمة المرور يجب أن تكون بين 8 و72 حرفًا.\n");
    exit(1);
}

$pdo = Database::connection();

$check = $pdo->prepare('SELECT id FROM users WHERE email = ? OR phone = ?');
$check->execute([$email, $phone]);
if ($check->fetch()) {
    fwrite(STDERR, "يوجد مستخدم بنفس البريد أو الهاتف بالفعل.\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_BCRYPT);

$stmt = $pdo->prepare(
    'INSERT INTO users (full_name, email, phone, password_hash, role, status, is_verified)
     VALUES (?, ?, ?, ?, "admin", "active", 1)'
);
$stmt->execute([$fullName, $email, $phone, $hash]);

echo "تم إنشاء حساب الأدمن بنجاح (ID: {$pdo->lastInsertId()}).\n";
