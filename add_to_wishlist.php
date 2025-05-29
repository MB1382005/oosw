<?php
// Buffer all output
ob_start();

require_once 'classes/Database.php';
require_once 'classes/Product.php';
require_once 'classes/Customer.php';

// Set content type to JSON AFTER the includes to prevent any accidental output
// Disable error display to prevent PHP notices from breaking JSON
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Handle preflight requests 
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Clean any existing output
    ob_end_clean();
    
    // Set CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
}

// Clean any existing output from includes or elsewhere
ob_end_clean();
ob_start(); // Start a new buffer

// Now set headers after clearing any previous output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

try {
    // Start session if not started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Add debug logging
    error_log('add_to_wishlist.php: Session status: ' . session_status() . ', Session ID: ' . session_id());
    error_log('add_to_wishlist.php: UserId set: ' . (isset($_SESSION['userId']) ? 'Yes, ID: ' . $_SESSION['userId'] : 'No'));
    
    // Check if user is logged in
    if (!isset($_SESSION['userId'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User not logged in']);
        exit;
    }
    
    // Get the request body - handle both POST JSON and GET/POST form parameters
    $requestBody = file_get_contents('php://input');
    error_log('add_to_wishlist.php: Raw request body: ' . $requestBody);
    
    $data = [];
    
    // Check content type to decide how to parse the request
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    error_log('add_to_wishlist.php: Content-Type: ' . $contentType);
    
    if (stripos($contentType, 'application/json') !== false && !empty($requestBody)) {
        $jsonData = json_decode($requestBody, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $data = $jsonData;
            error_log('add_to_wishlist.php: Parsed JSON data: ' . print_r($data, true));
        } else {
            error_log('add_to_wishlist.php: JSON parsing error: ' . json_last_error_msg());
        }
    }
    
    // Fallback to POST/GET if we don't have data yet
    if (empty($data)) {
        $data = array_merge($_GET, $_POST);
        error_log('add_to_wishlist.php: Using POST/GET data: ' . print_r($data, true));
    }
    
    // Check for action parameter - EXPLICITLY log what we're finding
    error_log('add_to_wishlist.php: action parameter exists: ' . (isset($data['action']) ? 'Yes' : 'No'));
    if (isset($data['action'])) {
        error_log('add_to_wishlist.php: action value: ' . $data['action']);
    }
    
    // Default action is 'add' if not specified
    $action = 'add';
    if (isset($data['action'])) {
        $action = $data['action'];
    }
    
    error_log('add_to_wishlist.php: Final action value: ' . $action);
    
    // Check for product ID
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
    
    // Debug the values that will be used for the database insert
    error_log('add_to_wishlist.php: Action: ' . $action . ' for productId: ' . $productId . ' and userId: ' . $userId);
    
    // Initialize database connection
    $database = Database::getInstance();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception("Database connection failed.");
    }
    
    // Check if this product already exists in wishlist
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM wishlist WHERE user_id = ? AND product_id = ?");
    $checkStmt->execute([$userId, $productId]);
    $exists = (int)$checkStmt->fetchColumn() > 0;
    
    error_log('add_to_wishlist.php: Product exists in wishlist: ' . ($exists ? 'Yes' : 'No'));
    
    // قبول أي قيمة للـ action أو تجاهل القيمة تمامًا - المهم أن نقوم بإضافة المنتج للمفضلة
    // if ($action === 'add') {
        if ($exists) {
            echo json_encode([
                'success' => true, 
                'message' => 'Product already in wishlist',
                'debug' => [
                    'user_id' => $userId,
                    'product_id' => $productId
                ]
            ]);
            exit;
        }
        
        // Fetch product details to verify it exists
        $stmt = $pdo->prepare("SELECT * FROM medicines WHERE id = ?");
        $stmt->execute([$productId]);
        $productData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$productData) {
            http_response_code(404);
            echo json_encode([
                'success' => false, 
                'message' => 'Product not found',
                'debug' => [
                    'product_id' => $productId
                ]
            ]);
            exit;
        }
        
        // Insert directly into wishlist table
        $insertStmt = $pdo->prepare("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)");
        $result = $insertStmt->execute([$userId, $productId]);
        
        error_log('add_to_wishlist.php: Insert result: ' . ($result ? 'Success' : 'Failed') . 
                  ', Last insert ID: ' . $pdo->lastInsertId());
        
        // Return JSON response
        echo json_encode([
            'success' => $result, 
            'message' => $result ? 'Product added to wishlist successfully' : 'Failed to add product to wishlist',
            'product_id' => $productId,
            'user_id' => $userId,
            'timestamp' => time() // Add timestamp to prevent caching issues
        ]);
    // } else {
    //     http_response_code(400);
    //     echo json_encode([
    //         'success' => false,
    //         'message' => 'Invalid action specified',
    //         'action' => $action
    //     ]);
    // }
    
} catch (Exception $e) {
    error_log('Error in add_to_wishlist.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

// Flush and end the output buffer
ob_end_flush();
exit; 