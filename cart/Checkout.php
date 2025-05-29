<?php
require_once __DIR__ . '/../classes/Database.php';

class Checkout {
    private $db;
    private $conn;

    public function __construct() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $this->db = Database::getInstance();
        $this->conn = $this->db->getConnection();
    }

    public function processCheckout($userId, $address, $phone) {
        try {
            $this->conn->beginTransaction();

            // Create order
            $date = date('Y-m-d H:i:s');
            $stmt = $this->conn->prepare("INSERT INTO orders (user_id, order_date, status, total_price) VALUES (?, ?, 'pending', 0)");
            $stmt->execute([$userId, $date]);
            $orderId = $this->conn->lastInsertId();

            // Get cart items with proper alias to avoid column conflicts
            $stmt = $this->conn->prepare("SELECT c.medicine_id, c.quantity, m.name, m.price AS med_price 
                                          FROM shopping_cart c 
                                          JOIN medicines m ON c.medicine_id = m.id 
                                          WHERE c.user_id = ?");
            $stmt->execute([$userId]);
            $cartItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $total = 0;
            foreach ($cartItems as $item) {
                // Calculate subtotal
                $subtotal = $item['med_price'] * $item['quantity'];

                // Insert into order_items
                $stmt = $this->conn->prepare("INSERT INTO order_items (order_id, medicine_id, quantity, price) VALUES (?, ?, ?, ?)");
                $stmt->execute([$orderId, $item['medicine_id'], $item['quantity'], $subtotal]);

                $total += $subtotal;
            }

            // Update total price in orders
            $stmt = $this->conn->prepare("UPDATE orders SET total_price = ? WHERE id = ?");
            $stmt->execute([$total, $orderId]);

            // Clear shopping cart
            $stmt = $this->conn->prepare("DELETE FROM shopping_cart WHERE user_id = ?");
            $stmt->execute([$userId]);

            $this->conn->commit();

            // Store order details in session
            $_SESSION['last_order'] = [
                'order_id' => sprintf("ORD%05d", $orderId), // Example: ORD00001
                'total' => $total,
                'date' => $date,
                'items' => $cartItems,
                'address' => $address,
                'phone' => $phone
            ];

            // Return success response instead of redirecting
            return ['success' => true, 'order_id' => sprintf("ORD%05d", $orderId)];

        } catch (PDOException $e) {
            $this->conn->rollBack();
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function __destruct() {
        $this->conn = null;
    }
}
