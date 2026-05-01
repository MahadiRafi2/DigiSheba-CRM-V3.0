<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'futureba_DigiShebaCRMUser'); // cPanel-এ আপনার ডেটাবেজ ইউজারনেম দিন
define('DB_PASS', 'SmjZB2.wD7)Q1G&T');     // cPanel-এ আপনার ডেটাবেজ পাসওয়ার্ড দিন
define('DB_NAME', 'futureba_DigiShebaCRM'); // cPanel-এ আপনার ডেটাবেজ নাম দিন

// JWT Secret
define('JWT_SECRET', 'super-secret-key');

// Error Reporting (Prod-এ off রাখবেন)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Disable display errors to prevent JSON corruption

function getDB() {
    try {
        $db = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8", DB_USER, DB_PASS);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $db;
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Connection failed: ' . $e->getMessage()]));
    }
}
