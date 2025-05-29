<?php
session_start();
require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/ShoppingCart.php';

header('Content-Type: application/json');

if (!isset($_SESSION['userId'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$productId = $data['product_id'] ?? null;
$quantity = $data['quantity'] ?? null;

if (!$productId || !$quantity) {
    echo json_encode(['success' => false, 'message' => 'Missing product ID or quantity']);
    exit();
}

try {
    $db = Database::getInstance();
    $pdo = $db->getConnection();
    
    $cart = new ShoppingCart($pdo, $_SESSION['userId']);
    $cart->updateQuantity($productId, $quantity);
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} 