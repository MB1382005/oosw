<?php
ob_start();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/UserManager.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

try {
    if (!isset($_SESSION['userId'])) {
        throw new Exception('User not logged in');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    }

    $json = file_get_contents('php://input');
    if (!$json) {
        throw new Exception('No data received');
    }

    $data = json_decode($json, true);
    if (!$data) {
        throw new Exception('Invalid JSON data: ' . json_last_error_msg());
    }

    if (empty($data['action'])) {
        throw new Exception('No action specified');
    }

    if ($data['action'] === 'update_profile') {
        if (empty($data['fname']) || empty($data['lname']) || empty($data['email'])) {
            throw new Exception('Required fields are missing');
        }
    } else {
        throw new Exception('Invalid action specified');
    }

       $database = Database::getInstance();
     $pdo = $database->getConnection();
    

    $userManager = new UserManager($pdo);
    
    $result = $userManager->updateUser($_SESSION['userId'], $data);
    
    if (!$result['success']) {
        throw new Exception($result['message']);
    }

    $response = [
        'success' => true,
        'message' => 'Profile updated successfully'
    ];

} catch (Exception $e) {
    error_log("Error in update_profile.php: " . $e->getMessage());
    $response = [
        'success' => false,
        'message' => $e->getMessage()
    ];
}

ob_clean();

echo json_encode($response);

ob_end_flush();
exit;
?> 