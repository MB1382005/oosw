<?php
// Start session if not started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set headers for proper JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Log all inputs for debugging
error_log('REQUEST_METHOD: ' . $_SERVER['REQUEST_METHOD']);
error_log('REQUEST: ' . print_r($_REQUEST, true));
error_log('POST: ' . print_r($_POST, true));
error_log('GET: ' . print_r($_GET, true));
error_log('RAW INPUT: ' . file_get_contents('php://input'));
error_log('SESSION: ' . print_r($_SESSION, true));

// Handle preflight CORS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Check if user is logged in
if (!isset($_SESSION['userId'])) {
    echo json_encode([
        'success' => false,
        'message' => 'User not logged in',
        'status' => 'error',
        'session_id' => session_id()
    ]);
    exit;
}

try {
    // Get the request data - try multiple methods to be sure
    $input = file_get_contents('php://input');
    
    // First try to decode JSON input
    $data = json_decode($input, true);
    
    // If JSON parsing fails, fall back to POST/GET
    if (json_last_error() !== JSON_ERROR_NONE) {
        $data = array_merge($_GET, $_POST);
    }
    
    // Log what we got
    error_log('PARSED DATA: ' . print_r($data, true));
    
    // Get product ID
    $productId = isset($data['product_id']) ? intval($data['product_id']) : 0;
    
    // Validate product ID
    if ($productId <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid product ID',
            'received_data' => $data,
            'raw_input' => $input
        ]);
        exit;
    }
    
    // Connect to database
    $db = new PDO(
        'mysql:host=localhost;dbname=pharmacy_db;charset=utf8mb4',
        'root',
        '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // Check if product exists
    $stmt = $db->prepare("SELECT COUNT(*) FROM medicines WHERE id = ?");
    $stmt->execute([$productId]);
    $productExists = (bool)$stmt->fetchColumn();
    
    if (!$productExists) {
        echo json_encode([
            'success' => false,
            'message' => 'Product not found',
            'product_id' => $productId
        ]);
        exit;
    }
    
    // Check if product is already in wishlist
    $stmt = $db->prepare("SELECT COUNT(*) FROM wishlist WHERE user_id = ? AND product_id = ?");
    $stmt->execute([$_SESSION['userId'], $productId]);
    $alreadyInWishlist = (bool)$stmt->fetchColumn();
    
    if ($alreadyInWishlist) {
        echo json_encode([
            'success' => true,
            'message' => 'Product already in wishlist',
            'product_id' => $productId,
            'user_id' => $_SESSION['userId']
        ]);
        exit;
    }
    
    // Insert into wishlist
    $stmt = $db->prepare("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)");
    $success = $stmt->execute([$_SESSION['userId'], $productId]);
    
    echo json_encode([
        'success' => $success,
        'message' => $success ? 'Product added to wishlist successfully' : 'Failed to add product to wishlist',
        'product_id' => $productId,
        'user_id' => $_SESSION['userId'],
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log('Error in add_to_wishlist_direct.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?> 