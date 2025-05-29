<?php
ob_start();

require_once 'classes/Database.php';
require_once 'classes/Product.php';

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
}

ob_end_clean();
ob_start(); 

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

try {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    error_log('get_wishlist.php: Session status: ' . session_status() . ', Session ID: ' . session_id());
    error_log('get_wishlist.php: UserId set: ' . (isset($_SESSION['userId']) ? 'Yes, ID: ' . $_SESSION['userId'] : 'No'));
    
    if (!isset($_SESSION['userId'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'message' => 'User not logged in',
            'session_status' => session_status(),
            'session_id' => session_id()
        ]);
        exit;
    }
    
    $userId = $_SESSION['userId'];
    
    $database = Database::getInstance();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception("Database connection failed.");
    }
    
    $query = "
        SELECT m.*, c.name AS category_name, w.created_at AS wishlist_added_at
        FROM wishlist w
        JOIN medicines m ON w.product_id = m.id
        LEFT JOIN categories c ON m.category_id = c.id
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC
    ";
    error_log('get_wishlist.php: Executing query for user_id: ' . $userId);
    error_log('get_wishlist.php: Query: ' . $query);
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$userId]);
    $wishlistItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    error_log('get_wishlist.php: Found ' . count($wishlistItems) . ' wishlist items');
    
    $products = [];
    foreach ($wishlistItems as $item) {
        if (!method_exists('Product', 'fromArray')) {
            throw new Exception("Product::fromArray method not found");
        }
        
        try {
            $product = Product::fromArray($item);
            $productArray = $product->toArray();
            $productArray['wishlist_added_at'] = $item['wishlist_added_at'];
            $products[] = $productArray;
        } catch (Exception $e) {
            error_log('Error processing wishlist item: ' . $e->getMessage());
        }
    }
    
    error_log('get_wishlist.php: Processed ' . count($products) . ' products for response');
    
    echo json_encode([
        'success' => true,
        'message' => 'Wishlist retrieved successfully',
        'wishlist' => $products,
        'user_id' => $userId,
        'count' => count($products),
        'timestamp' => time() 
    ]);
    
} catch (Exception $e) {
    error_log('Error in get_wishlist.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

// Flush and end the output buffer
ob_end_flush();
exit; 