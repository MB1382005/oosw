<?php
require_once 'Product.php';

class ShoppingCart {
    private PDO $pdo;
    private int $userId;
    public array $items = [];
    public float $totalAmount = 0.0;

    public function __construct(PDO $pdo, int $userId) {
        $this->pdo = $pdo;
        $this->userId = $userId;
        $this->loadCart();
    }

    public function loadCart(): void {
        $stmt = $this->pdo->prepare("
            SELECT m.id, m.name, m.price, m.image_url, c.name AS category_name, sc.quantity
            FROM shopping_cart sc
            JOIN medicines m ON sc.medicine_id = m.id
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE sc.user_id = :user_id
        ");
        $stmt->execute(['user_id' => $this->userId]);
        $this->items = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $product = new Product([
                'id' => $row['id'],
                'name' => $row['name'],
                'price' => $row['price'],
                'image_url' => $row['image_url'],
                'category_name' => $row['category_name']
            ]);
            $this->items[] = [
                'product' => $product,
                'quantity' => $row['quantity']
            ];
        }
        $this->calculateTotal();
    }

    public function addItem(Product $product): void {
        foreach ($this->items as &$item) {
            if ($item['product']->id === $product->id) {
                $item['quantity']++;
                $this->updateItemInDb($product->id, $item['quantity']);
                $this->calculateTotal();
                return;
            }
        }
        $this->items[] = ['product' => $product, 'quantity' => 1];
        $this->addItemToDb($product->id, 1);
        $this->calculateTotal();
    }

    public function addItemToDb(int $medicineId, int $quantity): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO shopping_cart (user_id, medicine_id, quantity, price)
            VALUES (:user_id, :medicine_id, :quantity,
                (SELECT price FROM medicines WHERE id = :medicine_id))
            ON DUPLICATE KEY UPDATE quantity = quantity + 1
        ");
        $stmt->execute([
            'user_id' => $this->userId,
            'medicine_id' => $medicineId,
            'quantity' => $quantity
        ]);
    }

    public function updateItemInDb(int $medicineId, int $quantity): void {
        $stmt = $this->pdo->prepare("
            UPDATE shopping_cart
            SET quantity = :quantity
            WHERE user_id = :user_id AND medicine_id = :medicine_id
        ");
        $stmt->execute([
            'user_id' => $this->userId,
            'medicine_id' => $medicineId,
            'quantity' => $quantity
        ]);
    }

    public function updateQuantity(int $medicineId, int $quantity): void {
        $this->updateItemInDb($medicineId, $quantity);
        $this->loadCart();
    }

    public function removeItem(Product $product): void {
        foreach ($this->items as $index => $item) {
            if ($item['product']->id === $product->id) {
                unset($this->items[$index]);
                $this->items = array_values($this->items);
                $this->removeItemFromDb($product->id);
                $this->calculateTotal();
                return;
            }
        }
    }

    public function removeItemFromDb(int $medicineId): void {
        $stmt = $this->pdo->prepare("
            DELETE FROM shopping_cart
            WHERE user_id = :user_id AND medicine_id = :medicine_id
        ");
        $stmt->execute([
            'user_id' => $this->userId,
            'medicine_id' => $medicineId
        ]);
    }

    public function calculateTotal(): void {
        $this->totalAmount = 0;
        foreach ($this->items as $item) {
            $this->totalAmount += $item['product']->price * $item['quantity'];
        }
    }

    public function getItems(): array {
        $this->loadCart();
        return array_map(function($item) {
            return [
                'id' => $item['product']->id,
                'name' => $item['product']->name,
                'price' => $item['product']->price,
                'quantity' => $item['quantity'],
                'image_url' => $item['product']->image_url,
                'category_name' => $item['product']->category_name
            ];
        }, $this->items);
    }
}