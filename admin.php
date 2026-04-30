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

// Auth Check Helper
function getAuthUser() {
    $headers = apache_request_headers();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
        return JWT::decode($matches[1], JWT_SECRET);
    }
    return null;
}

$user = getAuthUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized access']);
    exit;
}

// Admin Router
switch (true) {
    // Dashboard Stats
    case ($request === 'stats' && $method === 'GET'):
        $stmt = $db->prepare("SELECT SUM(amount) as revenue, SUM(profit) as profit FROM sales WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $sales = $stmt->fetch();
        
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM customers WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $customers = $stmt->fetch();
        
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM sales WHERE user_id = ? AND status = 'Pending'");
        $stmt->execute([$user['id']]);
        $pending = $stmt->fetch();

        echo json_encode([
            'revenue' => (float)($sales['revenue'] ?? 0),
            'profit' => (float)($sales['profit'] ?? 0),
            'customers' => (int)($customers['count'] ?? 0),
            'pendingOrders' => (int)($pending['count'] ?? 0)
        ]);
        break;

    // Customers Management
    case ($request === 'customers' && $method === 'GET'):
        $stmt = $db->prepare("SELECT * FROM customers WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user['id']]);
        echo json_encode($stmt->fetchAll());
        break;

    // Products Management
    case ($request === 'products' && $method === 'GET'):
        $stmt = $db->prepare("SELECT * FROM products WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        echo json_encode($stmt->fetchAll());
        break;

    case ($request === 'products' && $method === 'POST'):
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("INSERT INTO products (user_id, name, type, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$user['id'], $data['name'], $data['type'], $data['cost_price'], $data['selling_price']]);
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        break;

    // Branding Settings
    case ($request === 'settings/branding' && $method === 'GET'):
        $stmt = $db->prepare("SELECT * FROM branding_settings WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $res = $stmt->fetch();
        echo json_encode($res ?: ['site_name' => 'DigiSheba', 'show_floating_login' => 1]);
        break;

    case ($request === 'settings/branding' && $method === 'POST'):
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("
            INSERT INTO branding_settings (user_id, logo_url, admin_logo_url, favicon_url, site_name, show_floating_login)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                logo_url = VALUES(logo_url),
                admin_logo_url = VALUES(admin_logo_url),
                favicon_url = VALUES(favicon_url),
                site_name = VALUES(site_name),
                show_floating_login = VALUES(show_floating_login)
        ");
        $stmt->execute([
            $user['id'], 
            $data['logo_url'], 
            $data['admin_logo_url'], 
            $data['favicon_url'], 
            $data['site_name'], 
            $data['show_floating_login']
        ]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Admin action not found']);
        break;
}
?>
