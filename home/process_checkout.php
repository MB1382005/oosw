<?php
require_once '../classes/Database.php';
session_start();

header('Content-Type: application/json');

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    if (!isset($_SESSION['userId'])) {
        throw new Exception('User not logged in');
    }
    $userId = $_SESSION['userId'];

    $data = json_decode(file_get_contents("php://input"), true);
    $addressFromClient = $data['address'] ?? null;
    $phoneFromClient = $data['phone'] ?? null;

    $stmt = $conn->prepare("SELECT address, phone FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$userData || empty($userData['address']) || empty($userData['phone'])) {
        if ($addressFromClient && $phoneFromClient) {
            $stmt = $conn->prepare("UPDATE users SET address = ?, phone = ? WHERE id = ?");
            $stmt->execute([$addressFromClient, $phoneFromClient, $userId]);

            $userData['address'] = $addressFromClient;
            $userData['phone'] = $phoneFromClient;
        } else {
            echo json_encode(['needsInfo' => true]);
            exit;
        }
    }

    $conn->beginTransaction();

    $stmt = $conn->prepare("INSERT INTO orders (user_id, order_date, status) VALUES (?, NOW(), 'pending')");
    $stmt->execute([$userId]);
    $orderId = $conn->lastInsertId();

    $stmt = $conn->prepare("SELECT c.*, m.price FROM shopping_cart c 
                            JOIN medicines m ON c.medicine_id = m.id 
                            WHERE c.user_id = ?");
    $stmt->execute([$userId]);
    $cartItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($cartItems)) {
        throw new Exception('Shopping cart is empty');
    }

    $total = 0;
    foreach ($cartItems as $item) {
        $stmt = $conn->prepare("INSERT INTO order_items (order_id, medicine_id, quantity, price) VALUES (?, ?, ?, ?)");
        $stmt->execute([$orderId, $item['medicine_id'], $item['quantity'], $item['price']]);
        $total += $item['price'] * $item['quantity'];
    }

    $stmt = $conn->prepare("UPDATE orders SET total_price = ? WHERE id = ?");
    $stmt->execute([$total, $orderId]);

    $stmt = $conn->prepare("DELETE FROM shopping_cart WHERE user_id = ?");
    $stmt->execute([$userId]);

    $conn->commit();

    $_SESSION['last_order'] = [
        'order_id' => sprintf("ORD%05d", $orderId),
        'total' => $total,
        'date' => date('Y-m-d H:i:s'),
        'items' => $cartItems,
        'address' => $addressFromClient ?: $userData['address'],
        'phone' => $phoneFromClient ?: $userData['phone']
    ];

    echo json_encode([
        'success' => true,
        'order_id' => sprintf("ORD%05d", $orderId)
    ]);

} catch (Exception $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
