<?php
require_once '../classes/Database.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['userId'])) {
    echo json_encode([
        'success' => false,
        'message' => 'يجب تسجيل الدخول أولاً'
    ]);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    $stmt = $conn->prepare("
        SELECT o.*, u.fname, u.lname, u.email, u.address, u.phone 
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.user_id = ?
        ORDER BY o.order_date DESC
        LIMIT 1
    ");
    $stmt->execute([$_SESSION['userId']]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        echo json_encode([
            'success' => false,
            'message' => 'لم يتم العثور على تفاصيل الطلب'
        ]);
        exit;
    }

    $stmt = $conn->prepare("
        SELECT oi.*, m.name as medicine_name
        FROM order_items oi
        JOIN medicines m ON oi.medicine_id = m.id
        WHERE oi.order_id = ?
    ");
    $stmt->execute([$order['id']]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $orderDetails = [
        'order_id' => sprintf("ORD%05d", $order['id']),
        'date' => $order['order_date'],
        'total' => $order['total_price'],
        'status' => $order['status'],
        'customer_name' => trim($order['fname'] . ' ' . $order['lname']),
        'email' => $order['email'],
        'address' => $order['address'],
        'phone' => $order['phone'],
        'items' => array_map(function($item) {
            return [
                'name' => $item['medicine_name'],
                'quantity' => $item['quantity'],
                'price' => $item['price']
            ];
        }, $items)
    ];

    echo json_encode([
        'success' => true,
        'order_details' => $orderDetails
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'حدث خطأ في جلب تفاصيسسسل الطلب: ' . $e->getMessage()
    ]);
}
?>
