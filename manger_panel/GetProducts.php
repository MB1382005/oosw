<?php
ob_start();
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/Product.php';

try {
    $database = Database::getInstance();
    $conn = $database->getConnection();
    if (!$conn) {
        throw new Exception("Database connection failed.");
    }
    $pdo = $conn;
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $productId = isset($_GET['id']) ? intval($_GET['id']) : null;

    if ($productId) {
        $stmt = $pdo->prepare("
            SELECT m.*, c.name AS category_name 
            FROM medicines m 
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE m.id = ?
        ");
        $stmt->execute([$productId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $product = Product::fromArray($row);
            if (ob_get_length()) ob_end_clean();
            echo json_encode([
                'status' => 'success',
                'product' => $product->toArray()
            ], JSON_UNESCAPED_UNICODE);
        } else {
            if (ob_get_length()) ob_end_clean();
            echo json_encode([
                'status' => 'error',
                'message' => 'Product not found.'
            ]);
        }
    } else {
        $stmt = $pdo->query("
            SELECT m.*, c.name AS category_name 
            FROM medicines m 
            LEFT JOIN categories c ON m.category_id = c.id
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $products = Product::fromArrayList($rows);
        $productsArray = array_map(fn($p) => $p->toArray(), $products);

        if (ob_get_length()) ob_end_clean();
        echo json_encode([
            'status' => 'success',
            'products' => $productsArray
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (Throwable $e) {
    if (ob_get_length()) ob_end_clean();
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

