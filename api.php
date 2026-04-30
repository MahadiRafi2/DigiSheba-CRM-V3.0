<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once 'config.php';
require_once 'JWT.php';

$request = $_GET['request'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// Helper to get Auth User
function getAuthUser() {
    $headers = apache_request_headers();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
        return JWT::decode($matches[1], JWT_SECRET);
    }
    return null;
}

// Simple Router
switch (true) {
    // Auth Routes
    case ($request === 'auth/login' && $method === 'POST'):
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch();
        if ($user && password_verify($data['password'], $user['password'])) {
            $token = JWT::encode(['id' => $user['id'], 'email' => $user['email'], 'name' => $user['name']], JWT_SECRET);
            echo json_encode(['token' => $token, 'user' => ['id' => $user['id'], 'email' => $user['email'], 'name' => $user['name']]]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
        }
        break;

    case ($request === 'auth/register' && $method === 'POST'):
        $data = json_decode(file_get_contents('php://input'), true);
        $hash = password_hash($data['password'], PASSWORD_DEFAULT);
        try {
            $stmt = $db->prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
            $stmt->execute([$data['email'], $hash, $data['name']]);
            $userId = $db->lastInsertId();
            $token = JWT::encode(['id' => $userId, 'email' => $data['email'], 'name' => $data['name']], JWT_SECRET);
            echo json_encode(['token' => $token, 'user' => ['id' => $userId, 'email' => $data['email'], 'name' => $data['name']]]);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already exists']);
        }
        break;

    // Stats
    case ($request === 'stats' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("SELECT SUM(amount) as revenue, SUM(profit) as profit FROM sales WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $sales = $stmt->fetch();
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM customers WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $customers = $stmt->fetch();
        echo json_encode([
            'revenue' => (float)($sales['revenue'] ?? 0),
            'profit' => (float)($sales['profit'] ?? 0),
            'customers' => (int)($customers['count'] ?? 0)
        ]);
        break;

    // Customers
    case ($request === 'customers' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("SELECT * FROM customers WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user['id']]);
        echo json_encode($stmt->fetchAll());
        break;

    // Products
    case ($request === 'products' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("SELECT * FROM products WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        echo json_encode($stmt->fetchAll());
        break;

    // Sales (Orders)
    case ($request === 'sales' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("
            SELECT s.*, c.name as customer_name, c.email, c.phone, p.name as product_name 
            FROM sales s
            JOIN customers c ON s.customer_id = c.id
            JOIN products p ON s.product_id = p.id
            WHERE s.user_id = ?
            ORDER BY s.date DESC
        ");
        $stmt->execute([$user['id']]);
        echo json_encode($stmt->fetchAll());
        break;

    // Public Branding
    case ($request === 'public/branding' && $method === 'GET'):
        $stmt = $db->query("SELECT * FROM users ORDER BY id ASC LIMIT 1");
        $u = $stmt->fetch();
        if (!$u) {
            echo json_encode(['site_name' => 'DigiSheba', 'show_floating_login' => 1]);
            exit;
        }
        $stmt = $db->prepare("SELECT * FROM branding_settings WHERE user_id = ?");
        $stmt->execute([$u['id']]);
        $res = $stmt->fetch();
        echo json_encode($res ?: ['site_name' => 'DigiSheba', 'show_floating_login' => 1]);
        break;

    // Handle other routes or 404
    default:
        http_response_code(404);
        echo json_encode(['error' => 'API Endpoint not found or method not allowed']);
        break;
}
?>
