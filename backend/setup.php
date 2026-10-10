<?php
/**
 * إعداد صيدلية برو من الصفر — سكربت واحد يقوم بكل شيء.
 * الاستخدام (من داخل مجلد backend، بالضبط هذا الأمر):
 *   php setup.php
 *
 * يعمل بنفس الطريقة على Windows (cmd/PowerShell) وmacOS وLinux، لأنه PHP خالص
 * ولا يعتمد على أي أمر نظام تشغيل مختلف بينها.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('هذا السكربت يعمل من الطرفية فقط (php setup.php)، وليس من المتصفح.');
}

const ROOT = __DIR__;

function line(string $text = ''): void
{
    echo $text . PHP_EOL;
}

function section(string $title): void
{
    line();
    line('==================================================');
    line($title);
    line('==================================================');
}

function ask(string $label, string $default = ''): string
{
    $suffix = $default !== '' ? " [$default]" : '';
    echo "$label$suffix: ";
    $value = trim((string) fgets(STDIN));
    return $value === '' ? $default : $value;
}

function askYesNo(string $label, bool $defaultYes = true): bool
{
    $hint = $defaultYes ? 'Y/n' : 'y/N';
    echo "$label ($hint): ";
    $value = strtolower(trim((string) fgets(STDIN)));
    if ($value === '') {
        return $defaultYes;
    }
    return in_array($value, ['y', 'yes', 'نعم', 'ن'], true);
}

function fail(string $message): never
{
    line();
    line("✗ $message");
    line();
    exit(1);
}

function ok(string $message): void
{
    line("✓ $message");
}

// ------------------------------------------------------------------
section('1) فحص PHP والامتدادات المطلوبة');
// ------------------------------------------------------------------

if (PHP_VERSION_ID < 80100) {
    fail('يلزم PHP 8.1 فأكثر. نسختك الحالية: ' . PHP_VERSION);
}
ok('إصدار PHP: ' . PHP_VERSION);

foreach (['pdo_mysql', 'fileinfo', 'json'] as $ext) {
    if (!extension_loaded($ext)) {
        fail("امتداد PHP المطلوب \"$ext\" غير مفعّل. فعّله في php.ini ثم أعد تشغيل هذا السكربت.");
    }
}
ok('كل الامتدادات المطلوبة مفعّلة (pdo_mysql, fileinfo, json).');

// ------------------------------------------------------------------
section('2) قاعدة البيانات');
// ------------------------------------------------------------------

line('يمكن لهذا السكربت إنشاء قاعدة البيانات والجداول ومستخدم خاص بالتطبيق تلقائيًا،');
line('أو يمكنك إدخال بيانات اتصال جاهزة بقاعدة بيانات أعددتها بنفسك مسبقًا.');
line();

$autoSetup = askYesNo('هل تريد إنشاء قاعدة البيانات تلقائيًا الآن؟', true);

$dbHost = '127.0.0.1';
$dbName = 'pharmacy_pro';
$dbUser = '';
$dbPass = '';

if ($autoSetup) {
    line();
    line('أدخل بيانات مستخدم يملك صلاحية إنشاء قواعد بيانات (عادة root):');
    $adminHost = ask('عنوان خادم MySQL/MariaDB', '127.0.0.1');
    $adminUser = ask('اسم المستخدم الإداري', 'root');
    echo 'كلمة مرور المستخدم الإداري (قد تكون فارغة): ';
    $adminPass = trim((string) fgets(STDIN));

    try {
        $adminPdo = new PDO(
            "mysql:host=$adminHost;charset=utf8mb4",
            $adminUser,
            $adminPass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    } catch (PDOException $e) {
        line();
        line('تعذّر الاتصال بالمستخدم الإداري. السبب: ' . $e->getMessage());
        line();
        if (str_contains($e->getMessage(), '2002') || stripos($e->getMessage(), 'refused') !== false) {
            line('يبدو أن خادم MySQL/MariaDB غير شغّال، أو العنوان/المنفذ غير صحيح.');
        } elseif (str_contains($e->getMessage(), '1698') || str_contains($e->getMessage(), '1045')) {
            line('مرفوض الدخول بهذا المستخدم. على أنظمة Linux، حساب root الافتراضي');
            line('غالبًا لا يعمل عبر الشبكة (TCP) بكلمة مرور فارغة — فقط عبر المقبس المحلي.');
            line('جرّب تسجيل الدخول بحساب MySQL آخر تعرف كلمة مروره، أو شغّل محليًا:');
            line('  sudo mysql');
            line('  ALTER USER \'root\'@\'localhost\' IDENTIFIED BY \'كلمة_مرور_جديدة\';');
            line('ثم أعد تشغيل هذا السكربت وأدخل تلك الكلمة.');
        }
        fail('لم يكتمل الإعداد التلقائي. يمكنك اختيار "n" في السؤال السابق وإدخال بيانات قاعدة جاهزة بدلًا من ذلك.');
    }
    ok('تم الاتصال بخادم قاعدة البيانات.');

    // استيراد المخطط (ينشئ القاعدة pharmacy_pro وكل الجداول — آمن التكرار)
    $schemaPath = ROOT . '/database/schema.sql';
    if (!is_file($schemaPath)) {
        fail("ملف المخطط غير موجود: $schemaPath");
    }
    $sql = file_get_contents($schemaPath);
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($statements as $stmt) {
        // تجاهل الأسطر التي هي تعليقات فقط
        $cleaned = preg_replace('/^(--.*\n?)+/m', '', $stmt);
        if (trim($cleaned) === '') {
            continue;
        }
        $adminPdo->exec($cleaned);
    }
    ok("تم إنشاء قاعدة البيانات \"$dbName\" وكل الجداول.");

    // مستخدم مخصص للتطبيق بدل استخدام root في الإنتاج
    $appUser = ask('اسم مستخدم قاعدة البيانات الذي سينشأ للتطبيق', 'pharmacy_app');
    $appPass = ask('كلمة مرور هذا المستخدم (اتركها فارغة لتوليد كلمة عشوائية)', '');
    if ($appPass === '') {
        $appPass = bin2hex(random_bytes(9));
        line("تم توليد كلمة مرور عشوائية: $appPass");
        line('احتفظ بها — لن تظهر مرة أخرى بعد هذا السكربت (لكنها ستُحفظ في .env).');
    }

    foreach (['%', 'localhost'] as $host) {
        $adminPdo->exec(
            "CREATE USER IF NOT EXISTS " . $adminPdo->quote($appUser) . "@'$host' IDENTIFIED BY " . $adminPdo->quote($appPass)
        );
        $adminPdo->exec("GRANT ALL PRIVILEGES ON `$dbName`.* TO " . $adminPdo->quote($appUser) . "@'$host'");
    }
    $adminPdo->exec('FLUSH PRIVILEGES');
    ok("تم إنشاء مستخدم التطبيق \"$appUser\" ومنحه صلاحيات على قاعدة \"$dbName\" فقط.");

    $dbHost = $adminHost === 'localhost' ? '127.0.0.1' : $adminHost; // TCP دائمًا للتطبيق
    $dbUser = $appUser;
    $dbPass = $appPass;
} else {
    line();
    line('أدخل بيانات اتصال قاعدة بيانات أعددتها مسبقًا (تأكد من استيراد database/schema.sql إليها):');
    $dbHost = ask('DB_HOST', '127.0.0.1');
    $dbName = ask('DB_NAME', 'pharmacy_pro');
    $dbUser = ask('DB_USER', 'pharmacy_app');
    echo 'DB_PASS: ';
    $dbPass = trim((string) fgets(STDIN));
}

// ------------------------------------------------------------------
section('3) ملف .env');
// ------------------------------------------------------------------

$envPath = ROOT . '/.env';
$jwtSecret = bin2hex(random_bytes(32));

$frontendOrigin = ask('نطاق الواجهة الأمامية (اتركه كما هو للتطوير المحلي)', 'http://localhost:5173,http://127.0.0.1:5173');

$envContent = <<<ENV
DB_HOST=$dbHost
DB_NAME=$dbName
DB_USER=$dbUser
DB_PASS=$dbPass
DB_CHARSET=utf8mb4

JWT_SECRET=$jwtSecret
JWT_TTL_HOURS=12

FRONTEND_ORIGIN=$frontendOrigin

APP_DEBUG=true

ENV;

if (is_file($envPath)) {
    $overwrite = askYesNo('يوجد ملف .env بالفعل — استبداله؟', false);
    if (!$overwrite) {
        line('تم تخطّي كتابة .env. راجعه يدويًا إن احتجت.');
    } else {
        file_put_contents($envPath, $envContent);
        ok('تم استبدال .env بمفتاح JWT عشوائي جديد وبيانات القاعدة المُدخلة.');
    }
} else {
    file_put_contents($envPath, $envContent);
    ok('تم إنشاء .env بمفتاح JWT عشوائي آمن (32 بايت) وبيانات القاعدة.');
}

// ------------------------------------------------------------------
section('4) التحقق النهائي من الاتصال');
// ------------------------------------------------------------------

putenv("DB_HOST=$dbHost");
putenv("DB_NAME=$dbName");
putenv("DB_USER=$dbUser");
putenv("DB_PASS=$dbPass");

try {
    $testPdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $count = (int) $testPdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    ok("الاتصال يعمل. عدد المستخدمين الحاليين في القاعدة: $count.");
} catch (PDOException $e) {
    fail('فشل الاتصال النهائي بهذه البيانات: ' . $e->getMessage());
}

// ------------------------------------------------------------------
section('5) مجلد رفع الملفات');
// ------------------------------------------------------------------

$uploadDir = ROOT . '/uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}
@chmod($uploadDir, 0775); // لا تأثير له على Windows، وآمن على Linux/macOS
if (is_writable($uploadDir)) {
    ok('مجلد uploads/ قابل للكتابة.');
} else {
    line('⚠ مجلد uploads/ غير قابل للكتابة. امنحه صلاحية كتابة يدويًا إن واجهت خطأ عند رفع الصور.');
}

// ------------------------------------------------------------------
section('6) حساب الأدمن');
// ------------------------------------------------------------------

if ((int) $count === 0) {
    $createAdmin = askYesNo('لا يوجد أي حساب بعد. إنشاء أول حساب أدمن الآن؟', true);
    if ($createAdmin) {
        line();
        passthru(PHP_BINARY . ' ' . escapeshellarg(ROOT . '/database/create_admin.php'));
    } else {
        line('يمكنك إنشاؤه لاحقًا بالأمر: php database/create_admin.php');
    }
} else {
    ok('توجد حسابات في القاعدة بالفعل — تخطّينا إنشاء أدمن جديد.');
}

// ------------------------------------------------------------------
section('اكتمل الإعداد ✓');
// ------------------------------------------------------------------

line('شغّل الخادم الآن بهذا الأمر (من داخل مجلد backend):');
line();
line('    php -S localhost:8000 -t public public/router.php');
line();
line('ثم افتح مجلد frontend في طرفية أخرى واتبع تعليماته.');
line();
