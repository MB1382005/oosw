<?php
session_start();
require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/ShoppingCart.php';

header('Content-Type: application/json');

if (!isset($_SESSION['userId'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit();
}

try {
    $database = Database::getInstance();
    $pdo = $database->getConnection();
    
    $cart = new ShoppingCart($pdo, $_SESSION['userId']);
    $cartItems = $cart->getItems();

    echo json_encode($cartItems);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}