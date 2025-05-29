<?php
session_start();
if (!file_exists(__DIR__ . '/../classes/ShoppingCart.php') ||
    !file_exists(__DIR__ . '/../classes/Database.php') ||
    !file_exists(__DIR__ . '/../classes/Product.php')) {
    echo json_encode(['success' => false, 'message' => 'Required class file missing']);
    exit();
}

require_once __DIR__ . '/../classes/ShoppingCart.php';
require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/Product.php';


$database = Database::getInstance();
$pdo = $database->getConnection();

if (!isset($_SESSION['userId'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$productId = $data['product_id'] ?? null;

try {
    $product = Product::getById($pdo, $productId);
    if (!$product) {
        throw new Exception("Product not found");
    }

    $cart = new ShoppingCart($pdo, $_SESSION['userId']);
    $cart->addItem($product);
    
    echo json_encode([
        'success' => true,
        'product_name' => $product->name
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}