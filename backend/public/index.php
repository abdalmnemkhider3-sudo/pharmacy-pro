<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

spl_autoload_register(function (string $class) {
    $file = __DIR__ . '/../src/' . str_replace('\\', '/', $class) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

use Middleware\Cors;
use Support\Response;
use Controllers\AuthController;
use Controllers\MedicineController;
use Controllers\PrescriptionController;
use Controllers\MessageController;
use Controllers\AdminController;
use Controllers\DirectoryController;
use Controllers\OrderController;
use Controllers\PharmacyController;

Cors::handle();

set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage());
    Response::error('حدث خطأ غير متوقع.', 500, ['detail' => APP_DEBUG ? $e->getMessage() : null]);
});

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

$prefix = '/backend/public';
if (str_starts_with($requestUri, $prefix)) {
    $path = substr($requestUri, strlen($prefix));
} else {
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $baseFolder = rtrim(dirname($scriptName), '/\\');
    if ($baseFolder && str_starts_with($requestUri, $baseFolder)) {
        $path = substr($requestUri, strlen($baseFolder));
    } else {
        $path = $requestUri;
    }
}

$path = '/' . trim($path, '/');

if ($path === '/api') {
    $path = '/';
} elseif (str_starts_with($path, '/api/')) {
    $path = substr($path, 4) ?: '/';
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (
    $method === 'POST' && empty($_POST) && empty($_FILES)
    && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0
    && str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data')
) {
    Response::error('حجم الملفات المرفوعة يتجاوز الحد المسموح على الخادم (' . ini_get('post_max_size') . ').', 413);
}

if (in_array($method, ['GET', 'HEAD'], true) && $path === '/') {
    Response::ok(['ok' => true], 'Pharmacy Pro API');
}

$staticRoutes = [
    'POST /auth/register' => [AuthController::class, 'register'],
    'POST /auth/register-pharmacy' => [AuthController::class, 'registerPharmacy'],
    'POST /auth/login' => [AuthController::class, 'login'],
    'GET /auth/me' => [AuthController::class, 'me'],

    'GET /medicines' => [MedicineController::class, 'index'],
    'GET /medicines/mine' => [MedicineController::class, 'mine'],
    'POST /medicines' => [MedicineController::class, 'store'],

    'POST /prescriptions' => [PrescriptionController::class, 'store'],
    'GET /prescriptions/mine' => [PrescriptionController::class, 'mine'],
    'GET /prescriptions/incoming' => [PrescriptionController::class, 'incoming'],

    'POST /messages' => [MessageController::class, 'send'],
    'GET /messages/thread' => [MessageController::class, 'thread'],
    'GET /messages/conversations' => [MessageController::class, 'conversations'],

    'POST /orders' => [OrderController::class, 'store'],
    'GET /orders/mine' => [OrderController::class, 'mine'],
    'GET /orders/incoming' => [OrderController::class, 'incoming'],
    'GET /orders/assigned' => [OrderController::class, 'assigned'],

    'POST /admin/pharmacies' => [AdminController::class, 'createPharmacy'],
    'GET /admin/pharmacies/pending' => [AdminController::class, 'pendingPharmacies'],
    'GET /admin/users' => [AdminController::class, 'users'],

    'GET /pharmacy/profile' => [PharmacyController::class, 'profile'],
    'PUT /pharmacy/profile' => [PharmacyController::class, 'updateProfile'],

    'GET /directory/pharmacies' => [DirectoryController::class, 'pharmacies'],
    'GET /directory/doctors' => [DirectoryController::class, 'doctors'],
    'GET /directory/deliveries' => [DirectoryController::class, 'deliveries'],
];

$routeKey = "$method $path";
if (isset($staticRoutes[$routeKey])) {
    [$controller, $action] = $staticRoutes[$routeKey];
    $controller::$action();
    exit;
}

$dynamicRoutes = [
    '#^/medicines/(\d+)$#' => [
        'PUT' => [MedicineController::class, 'update'],
        'DELETE' => [MedicineController::class, 'destroy'],
    ],
    '#^/prescriptions/(\d+)/status$#' => [
        'PATCH' => [PrescriptionController::class, 'updateStatus'],
    ],
    '#^/orders/(\d+)/status$#' => [
        'PATCH' => [OrderController::class, 'updateStatus'],
    ],
    '#^/admin/users/(\d+)/verify$#' => [
        'POST' => [AdminController::class, 'verify'],
    ],
    '#^/admin/users/(\d+)/block$#' => [
        'POST' => [AdminController::class, 'block'],
    ],
    '#^/admin/users/(\d+)/unblock$#' => [
        'POST' => [AdminController::class, 'unblock'],
    ],
];

foreach ($dynamicRoutes as $pattern => $methods) {
    if (preg_match($pattern, $path, $matches) && isset($methods[$method])) {
        [$controller, $action] = $methods[$method];
        $controller::$action((int) $matches[1]);
        exit;
    }
}

Response::error('المسار غير موجود.', 404);