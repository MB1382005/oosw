<?php
session_start();
require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/ShoppingCart.php';
require_once __DIR__ . '/../classes/Product.php';

header('Content-Type: application/json');

if (!isset($_SESSION['userId'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$productId = $data['product_id'] ?? null;

if (!$productId) {
    echo json_encode(['success' => false, 'message' => 'Product ID is required']);
    exit();
}

try {
    $db = Database::getInstance();
    $pdo = $db->getConnection();
    
    $product = Product::getById($pdo, $productId);
    if (!$product) {
        throw new Exception("Product not found");
    }

    $cart = new ShoppingCart($pdo, $_SESSION['userId']);
    $cart->removeItem($product);
    
    echo json_encode([
        'success' => true,
        'message' => 'Item removed from cart'
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} 