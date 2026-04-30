<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root'); // cPanel-এ আপনার ডেটাবেজ ইউজারনেম দিন
define('DB_PASS', '');     // cPanel-এ আপনার ডেটাবেজ পাসওয়ার্ড দিন
define('DB_NAME', 'digisheba_db'); // cPanel-এ আপনার ডেটাবেজ নাম দিন

// JWT Secret
define('JWT_SECRET', 'super-secret-key');

// Error Reporting (Prod-এ off রাখবেন)
error_reporting(E_ALL);
ini_set('display_errors', 1);

function getDB() {
    try {
        $db = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8", DB_USER, DB_PASS);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $db;
    } catch (PDOException $e) {
        die(json_encode(['error' => 'Connection failed: ' . $e->getMessage()]));
    }
}
?>
