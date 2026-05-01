<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once 'config.php';
require_once 'JWT.php';

$request = $_GET['request'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// Create tables if they don't exist
$db->exec("CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'staff'
)");

$db->exec("CREATE TABLE IF NOT EXISTS smtp_settings (
    user_id INT PRIMARY KEY,
    host VARCHAR(255),
    port INT,
    user VARCHAR(255),
    pass VARCHAR(255),
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    secure TINYINT(1) DEFAULT 1,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)");

$db->exec("CREATE TABLE IF NOT EXISTS global_templates (
    user_id INT PRIMARY KEY,
    approved_subject TEXT,
    approved_body TEXT,
    rejected_subject TEXT,
    rejected_body TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)");

$db->exec("CREATE TABLE IF NOT EXISTS branding_settings (
    user_id INT PRIMARY KEY,
    logo_url TEXT,
    admin_logo_url TEXT,
    favicon_url TEXT,
    site_name VARCHAR(255),
    show_floating_login TINYINT(1) DEFAULT 1,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)");

$db->exec("CREATE TABLE IF NOT EXISTS woo_settings (
    user_id INT PRIMARY KEY,
    store_url VARCHAR(255),
    consumer_key VARCHAR(255),
    consumer_secret VARCHAR(255),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)");

$db->exec("CREATE TABLE IF NOT EXISTS renewal_email_settings (
    user_id INT PRIMARY KEY,
    day30_subject TEXT,
    day30_body TEXT,
    day15_subject TEXT,
    day15_body TEXT,
    expired_subject TEXT,
    expired_body TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)");

$db->exec("CREATE TABLE IF NOT EXISTS canva_renewal_settings (
    user_id INT PRIMARY KEY,
    packages TEXT,
    payment_info TEXT,
    banner_url TEXT,
    page_title VARCHAR(255),
    page_description TEXT,
    bkash_logo TEXT,
    nagad_logo TEXT,
    rocket_logo TEXT,
    redirect_url VARCHAR(255),
    approval_email_template TEXT,
    rejection_email_template TEXT,
    approval_email_subject VARCHAR(255),
    rejection_email_subject VARCHAR(255),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)");

$db->exec("CREATE TABLE IF NOT EXISTS canva_renewal_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    package_name VARCHAR(255),
    price DECIMAL(10,2),
    payment_method VARCHAR(100),
    sender_number VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at DATETIME,
    INDEX (user_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)");

// Create default admin if no users exist
$stmt = $db->query("SELECT COUNT(*) as count FROM users");
$userCount = $stmt->fetchColumn();
if ($userCount == 0) {
    $hash = password_hash('admin123', PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
    $stmt->execute(['admin@example.com', $hash, 'Admin User', 'admin']);
}

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
        $stmt = $db->prepare("SELECT SUM(amount) as revenue, SUM(profit) as profit FROM sales WHERE user_id = ? AND status = 'Approved'");
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

    // Enhanced Stats
    case ($request === 'enhanced-stats' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        
        $fetchStat = function($query, $uId) use ($db) {
            $stmt = $db->prepare($query);
            $stmt->execute([$uId]);
            return (float)($stmt->fetchColumn() ?: 0);
        };

        echo json_encode([
            'daily' => $fetchStat("SELECT SUM(amount) FROM sales WHERE user_id = ? AND status = 'Approved' AND date >= CURDATE()", $user['id']),
            'weekly' => $fetchStat("SELECT SUM(amount) FROM sales WHERE user_id = ? AND status = 'Approved' AND date >= DATE_SUB(NOW(), INTERVAL 7 DAY)", $user['id']),
            'monthly' => $fetchStat("SELECT SUM(amount) FROM sales WHERE user_id = ? AND status = 'Approved' AND date >= DATE_SUB(NOW(), INTERVAL 30 DAY)", $user['id']),
            'yearly' => $fetchStat("SELECT SUM(amount) FROM sales WHERE user_id = ? AND status = 'Approved' AND date >= DATE_SUB(NOW(), INTERVAL 365 DAY)", $user['id']),
            'lifetime' => $fetchStat("SELECT SUM(amount) FROM sales WHERE user_id = ? AND status = 'Approved'", $user['id']),
            'profit' => $fetchStat("SELECT SUM(profit) FROM sales WHERE user_id = ? AND status = 'Approved'", $user['id']),
            'customers' => (int)$fetchStat("SELECT COUNT(*) FROM customers WHERE user_id = ?", $user['id'])
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

    case ($request === 'products' && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("INSERT INTO products (user_id, name, type, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$user['id'], $data['name'], $data['type'], $data['cost_price'], $data['selling_price']]);
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        break;

    case ($request === 'products' && $method === 'DELETE'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("DELETE FROM products WHERE id = ? AND user_id = ?");
        $stmt->execute([$_GET['id'], $user['id']]);
        echo json_encode(['success' => true]);
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

    case ($method === 'PATCH' && preg_match('/^sales\/(\d+)\/status$/', $request, $matches)):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $orderId = $matches[1];
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("UPDATE sales SET status = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$data['status'], $orderId, $user['id']]);
        echo json_encode(['success' => true]);
        break;

    case ($request === 'sales' && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Find or create customer
        $stmt = $db->prepare("SELECT id FROM customers WHERE email = ? AND user_id = ?");
        $stmt->execute([$data['customer_email'], $user['id']]);
        $customer = $stmt->fetch();
        
        if (!$customer) {
            $stmt = $db->prepare("INSERT INTO customers (user_id, name, email, phone) VALUES (?, ?, ?, ?)");
            $stmt->execute([$user['id'], $data['customer_name'], $data['customer_email'], $data['customer_phone']]);
            $customerId = $db->lastInsertId();
        } else {
            $customerId = $customer['id'];
        }

        // Create sale
        $stmt = $db->prepare("INSERT INTO sales (user_id, customer_id, product_id, amount, profit, status, date) VALUES (?, ?, ?, ?, ?, 'Pending', NOW())");
        $stmt->execute([$user['id'], $customerId, $data['product_id'], $data['amount'], $data['profit']]);
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        break;

    case ($request === 'sales' && $method === 'DELETE'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("DELETE FROM sales WHERE id = ? AND user_id = ?");
        $stmt->execute([$_GET['id'], $user['id']]);
        echo json_encode(['success' => true]);
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

    // Admin Branding Settings (via /api/ prefix)
    case ($request === 'settings/branding' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("SELECT * FROM branding_settings WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $res = $stmt->fetch();
        echo json_encode($res ?: ['site_name' => 'DigiSheba', 'show_floating_login' => 1]);
        break;

    case ($request === 'settings/branding' && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
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

    case ($request === 'settings/smtp' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("SELECT * FROM smtp_settings WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        echo json_encode($stmt->fetch() ?: (object)[]);
        break;

    case ($request === 'settings/smtp' && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("
            INSERT INTO smtp_settings (user_id, host, port, user, pass, from_email, from_name, secure)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                host=VALUES(host), port=VALUES(port), user=VALUES(user), pass=VALUES(pass), 
                from_email=VALUES(from_email), from_name=VALUES(from_name), secure=VALUES(secure)
        ");
        $stmt->execute([$user['id'], $data['host'], $data['port'], $data['user'], $data['pass'], $data['from_email'], $data['from_name'], $data['secure'] ? 1 : 0]);
        echo json_encode(['success' => true]);
        break;

    case ($request === 'settings/templates' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("SELECT * FROM global_templates WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        echo json_encode($stmt->fetch() ?: [
            'approved_subject' => 'Order Approved!',
            'approved_body' => "Hi {customer_name},\n\nYour order for {product_name} has been approved.",
            'rejected_subject' => 'Order Rejected',
            'rejected_body' => "Hi {customer_name},\n\nSorry, your order for {product_name} was rejected."
        ]);
        break;

    case ($request === 'settings/templates' && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("
            INSERT INTO global_templates (user_id, approved_subject, approved_body, rejected_subject, rejected_body)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                approved_subject=VALUES(approved_subject), approved_body=VALUES(approved_body),
                rejected_subject=VALUES(rejected_subject), rejected_body=VALUES(rejected_body)
        ");
        $stmt->execute([$user['id'], $data['approved_subject'], $data['approved_body'], $data['rejected_subject'], $data['rejected_body']]);
        echo json_encode(['success' => true]);
        break;

    case ($request === 'settings/woo' && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("
            INSERT INTO woo_settings (user_id, store_url, consumer_key, consumer_secret)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                store_url=VALUES(store_url), consumer_key=VALUES(consumer_key), consumer_secret=VALUES(consumer_secret)
        ");
        $stmt->execute([$user['id'], $data['store_url'], $data['consumer_key'], $data['consumer_secret']]);
        echo json_encode(['success' => true]);
        break;

    case ($request === 'profile' && $method === 'PATCH'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        if (!empty($data['password'])) {
            $hash = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?");
            $stmt->execute([$data['name'], $data['email'], $hash, $user['id']]);
        } else {
            $stmt = $db->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
            $stmt->execute([$data['name'], $data['email'], $user['id']]);
        }
        echo json_encode(['success' => true]);
        break;

    case ($request === 'users' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->query("SELECT id, name, email, role FROM users ORDER BY id DESC");
        echo json_encode($stmt->fetchAll());
        break;

    case ($request === 'users' && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $hash = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'staff')");
        $stmt->execute([$data['name'], $data['email'], $hash]);
        echo json_encode(['success' => true]);
        break;

    case ($request === 'settings/renewal-emails' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("SELECT * FROM renewal_email_settings WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $settings = $stmt->fetch();
        echo json_encode($settings ?: [
            'day30_subject' => '', 'day30_body' => '',
            'day15_subject' => '', 'day15_body' => '',
            'expired_subject' => '', 'expired_body' => ''
        ]);
        break;

    case ($request === 'settings/renewal-emails' && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("
            INSERT INTO renewal_email_settings (user_id, day30_subject, day30_body, day15_subject, day15_body, expired_subject, expired_body)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                day30_subject=VALUES(day30_subject), day30_body=VALUES(day30_body),
                day15_subject=VALUES(day15_subject), day15_body=VALUES(day15_body),
                expired_subject=VALUES(expired_subject), expired_body=VALUES(expired_body)
        ");
        $stmt->execute([
            $user['id'], 
            $data['day30_subject'], $data['day30_body'],
            $data['day15_subject'], $data['day15_body'],
            $data['expired_subject'], $data['expired_body']
        ]);
        echo json_encode(['success' => true]);
        break;

    case ($request === 'public/canva-renewal/settings' && $method === 'GET'):
        $stmt = $db->query("SELECT * FROM canva_renewal_settings LIMIT 1");
        $settings = $stmt->fetch();
        if ($settings) {
            $settings['packages'] = json_decode($settings['packages'] ?: '[]', true);
            $settings['payment_info'] = json_decode($settings['payment_info'] ?: '{}', true);
        } else {
            $settings = [
                'packages' => [], 'payment_info' => (object)[],
                'banner_url' => '', 'page_title' => '', 'page_description' => '',
                'bkash_logo' => '', 'nagad_logo' => '', 'rocket_logo' => '', 'redirect_url' => ''
            ];
        }
        echo json_encode($settings);
        break;

    case ($request === 'public/canva-renewal/orders' && $method === 'POST'):
        $data = json_decode(file_get_contents('php://input'), true);
        // Find first admin to assign
        $stmt = $db->query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
        $admin = $stmt->fetch();
        $admin_id = $admin ? $admin['id'] : null;

        $stmt = $db->prepare("
            INSERT INTO canva_renewal_orders (user_id, name, phone, email, package_name, price, payment_method, sender_number, transaction_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $admin_id, $data['name'], $data['phone'], $data['email'],
            $data['package_name'], $data['price'], $data['payment_method'],
            $data['sender_number'], $data['transaction_id']
        ]);
        echo json_encode(['success' => true]);
        break;

    case ($request === 'admin/canva-renewal/orders' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->query("SELECT * FROM canva_renewal_orders ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
        break;

    case ($request === 'admin/canva-renewal/settings' && $method === 'GET'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $stmt = $db->prepare("SELECT * FROM canva_renewal_settings WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $settings = $stmt->fetch();
        if ($settings) {
            $settings['packages'] = json_decode($settings['packages'] ?: '[]', true);
            $settings['payment_info'] = json_decode($settings['payment_info'] ?: '{}', true);
        } else {
            $settings = [
                'packages' => [], 
                'payment_info' => (object)[],
                'banner_url' => '', 
                'page_title' => '', 
                'page_description' => '',
                'bkash_logo' => '', 
                'nagad_logo' => '', 
                'rocket_logo' => '', 
                'redirect_url' => '',
                'approval_email_template' => '',
                'rejection_email_template' => '',
                'approval_email_subject' => '',
                'rejection_email_subject' => ''
            ];
        }
        echo json_encode($settings);
        break;

    case ($request === 'admin/canva-renewal/settings' && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("
            INSERT INTO canva_renewal_settings 
            (user_id, packages, payment_info, banner_url, page_title, page_description, bkash_logo, nagad_logo, rocket_logo, redirect_url, approval_email_template, rejection_email_template, approval_email_subject, rejection_email_subject)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                packages=VALUES(packages), payment_info=VALUES(payment_info), banner_url=VALUES(banner_url), 
                page_title=VALUES(page_title), page_description=VALUES(page_description),
                bkash_logo=VALUES(bkash_logo), nagad_logo=VALUES(nagad_logo), rocket_logo=VALUES(rocket_logo),
                redirect_url=VALUES(redirect_url), approval_email_template=VALUES(approval_email_template),
                rejection_email_template=VALUES(rejection_email_template), 
                approval_email_subject=VALUES(approval_email_subject), rejection_email_subject=VALUES(rejection_email_subject)
        ");
        $stmt->execute([
            $user['id'], 
            json_encode($data['packages']), 
            json_encode($data['payment_info']), 
            $data['banner_url'], $data['page_title'], $data['page_description'], 
            $data['bkash_logo'], $data['nagad_logo'], $data['rocket_logo'], 
            $data['redirect_url'], $data['approval_email_template'], $data['rejection_email_template'],
            $data['approval_email_subject'], $data['rejection_email_subject']
        ]);
        echo json_encode(['success' => true]);
        break;

    case (preg_match('/^admin\/canva-renewal\/orders\/(\d+)\/status$/', $request, $matches) && $method === 'PATCH'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $id = $matches[1];
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare("UPDATE canva_renewal_orders SET status = ? WHERE id = ?");
        $stmt->execute([$data['status'], $id]);
        echo json_encode(['success' => true]);
        break;

    case (preg_match('/^admin\/canva-renewal\/orders\/(\d+)$/', $request, $matches) && ($method === 'PATCH' || $method === 'DELETE')):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $id = $matches[1];
        if ($method === 'DELETE') {
            $stmt = $db->prepare("DELETE FROM canva_renewal_orders WHERE id = ?");
            $stmt->execute([$id]);
        } else {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("UPDATE canva_renewal_orders SET name=?, phone=?, email=?, package_name=?, price=?, sender_number=?, transaction_id=? WHERE id=?");
            $stmt->execute([$data['name'], $data['phone'], $data['email'], $data['package_name'], $data['price'], $data['sender_number'], $data['transaction_id'], $id]);
        }
        echo json_encode(['success' => true]);
        break;

    case (preg_match('/^sales\/(\d+)\/send-renewal-email$/', $request, $matches) && $method === 'POST'):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $saleId = $matches[1];
        
        // Fetch sale, SMTP and settings
        $stmt = $db->prepare("SELECT s.*, c.email, c.name as customer_name, p.name as product_name FROM sales s JOIN customers c ON s.customer_id = c.id JOIN products p ON s.product_id = p.id WHERE s.id = ? AND s.user_id = ?");
        $stmt->execute([$saleId, $user['id']]);
        $sale = $stmt->fetch();
        
        if (!$sale) { http_response_code(404); echo json_encode(['error' => 'Sale not found']); exit; }
        
        $stmt = $db->prepare("SELECT * FROM smtp_settings WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $smtp = $stmt->fetch();
        
        if (!$smtp) { http_response_code(400); echo json_encode(['error' => 'SMTP not configured']); exit; }
        
        $stmt = $db->prepare("SELECT * FROM renewal_email_settings WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $rs = $stmt->fetch();
        
        if (!$rs) { http_response_code(400); echo json_encode(['error' => 'Renewal templates not configured']); exit; }
        
        // Determine which template to use (here we just use a generic logic or the 30 day one for manual trigger)
        $subject = $rs['day30_subject'] ?: 'Renewal Reminder';
        $body = $rs['day30_body'] ?: 'Hi {customer_name}, your {product_name} is expiring soon.';
        
        $body = str_replace(['{customer_name}', '{product_name}'], [$sale['customer_name'], $sale['product_name']], $body);
        
        // Note: Real email sending in PHP on cPanel usually uses mail() or PHPMailer
        // For simplicity and to match server.ts logic, let's assume some mail function or just return success
        // In a real scenario, we'd use PHPMailer here.
        
        echo json_encode(['success' => true, 'message' => 'Email logically sent (implement PHPMailer for real sending)']);
        break;

    case ($method === 'DELETE' && preg_match('/^users\/(\d+)$/', $request, $matches)):
        $user = getAuthUser();
        if (!$user) { http_response_code(401); exit; }
        $id = $matches[1];
        if ($id == $user['id']) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete yourself']);
            exit;
        }
        $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'API Endpoint not found or method not allowed']);
        break;
}
?>
