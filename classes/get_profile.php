<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

while (ob_get_level()) {
    ob_end_clean();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: no-cache, no-store, must-revalidate');

error_log('DEBUG: Starting get_profile.php execution');

try {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    error_log('DEBUG: Session ID = ' . session_id());
    error_log('DEBUG: Session user ID = ' . ($_SESSION['userId'] ?? 'Not set'));
    
    // التحقق من تسجيل دخول المستخدم
    if (!isset($_SESSION['userId'])) {
        error_log('DEBUG: User not logged in');
        echo json_encode([
            'success' => false, 
            'message' => 'User not logged in'
        ]);
        exit;
    }
    
    require_once 'Database.php';
    require_once 'Customer.php';
    
    $database = Database::getInstance();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception("Database connection failed");
    }
    
    error_log('DEBUG: Getting user profile data');
    $customer = new Customer($pdo, $_SESSION['email'] ?? '');
    
    try {
        $result = $customer->getProfile();
        error_log('DEBUG: Profile result: ' . json_encode($result));
    } catch (Exception $e) {
        error_log('ERROR: Exception in getProfile: ' . $e->getMessage());
        $result = [
            'success' => false,
            'message' => 'Error fetching profile data',
            'error_details' => $e->getMessage()
        ];
    }
    
    if (!isset($result) || !is_array($result)) {
        error_log('DEBUG: Invalid profile data, returning fallback');
        $result = [
            'success' => false,
            'message' => 'Invalid profile data returned'
        ];
    }
    
    if (isset($result['success']) && $result['success'] === true && !isset($result['data'])) {
        $result['data'] = [
            'user' => [
                'id' => $_SESSION['userId'],
                'email' => $_SESSION['email'] ?? 'unknown@email.com',
                'fname' => 'User',
                'lname' => $_SESSION['userId'],
            ],
            'orders' => []
        ];
    }
    
    error_log('DEBUG: About to output JSON response');
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log('ERROR: Global exception in get_profile.php: ' . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

    exit;
?>