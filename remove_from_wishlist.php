<?php
ob_start();

require_once 'classes/Database.php';

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
}

ob_end_clean();
ob_start(); 

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

try {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    error_log('remove_from_wishlist.php: Session status: ' . session_status() . ', Session ID: ' . session_id());
    error_log('remove_from_wishlist.php: UserId set: ' . (isset($_SESSION['userId']) ? 'Yes, ID: ' . $_SESSION['userId'] : 'No'));
    
    if (!isset($_SESSION['userId'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User not logged in']);
        exit;
    }
    
    $requestBody = file_get_contents('php://input');
    error_log('remove_from_wishlist.php: Raw request body: ' . $requestBody);
    $data = json_decode($requestBody, true);
    
    if (!isset($data['product_id']) || !is_numeric($data['product_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'Invalid product ID',
            'debug' => [
                'product_id_isset' => isset($data['product_id']),
                'product_id_value' => $data['product_id'] ?? 'not set',
                'is_numeric' => isset($data['product_id']) ? is_numeric($data['product_id']) : false
            ]
        ]);
        exit;
    }
    
    $productId = intval($data['product_id']);
    $userId = $_SESSION['userId'];
    
    error_log('remove_from_wishlist.php: Removing productId: ' . $productId . ' for userId: ' . $userId);
    
    $database = Database::getInstance();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception("Database connection failed.");
    }
    
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM wishlist WHERE user_id = ? AND product_id = ?");
    $checkStmt->execute([$userId, $productId]);
    $exists = (int)$checkStmt->fetchColumn() > 0;
    
    error_log('remove_from_wishlist.php: Product exists in wishlist: ' . ($exists ? 'Yes' : 'No'));
    
    if (!$exists) {
        echo json_encode([
            'success' => false, 
            'message' => 'Product not in wishlist',
            'debug' => [
                'user_id' => $userId,
                'product_id' => $productId
            ]
        ]);
        exit;
    }
    
    $deleteStmt = $pdo->prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?");
    $result = $deleteStmt->execute([$userId, $productId]);
    
    error_log('remove_from_wishlist.php: Delete result: ' . ($result ? 'Success' : 'Failed') . 
              ', Rows affected: ' . $deleteStmt->rowCount());
    
    if (!$result) {
        throw new Exception("Failed to remove item from wishlist");
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Product removed from wishlist successfully',
        'product_id' => $productId,
        'timestamp' => time() 
    ]);
    
} catch (Exception $e) {
    error_log('Error in remove_from_wishlist.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

ob_end_flush();
exit;
?> 