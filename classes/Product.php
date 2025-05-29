<?php
// Include necessary files
require_once(__DIR__ . "/Database.php");

class Product {
    public $id;
    public $name;
    public $brand;
    public $category_id;
    public $info;
    public $price;
    public $stock;
    public $image_url;
    public $expiration_date;
    public $prescription_required;
    public $created_at;
    public $updated_at;
    public $category_name;

    private $db;

    public function __construct($data = []) {
        $db = Database::getInstance();
        $this->db = $db->getConnection();

        $this->id = $data['id'] ?? null;
        $this->name = $data['name'] ?? '';
        $this->brand = $data['brand'] ?? '';
        $this->category_id = $data['category_id'] ?? null;
        $this->info = $data['info'] ?? '';
        $this->price = $data['price'] ?? 0;
        $this->stock = $data['stock'] ?? 0;
        $this->image_url = $data['image_url'] ?? '';
        $this->expiration_date = $data['expiration_date'] ?? null;
        $this->prescription_required = $data['prescription_required'] ?? 0;
        $this->created_at = $data['created_at'] ?? null;
        $this->updated_at = $data['updated_at'] ?? null;
        $this->category_name = $data['category_name'] ?? '';
    }

    public static function fromArray(array $row): self {
        return new self($row);
    }

    public static function fromArrayList(array $rows): array {
        return array_map(fn($row) => self::fromArray($row), $rows);
    }

    public function toArray(): array {
        $imgUrl = $this->image_url;
        if ($imgUrl && !str_starts_with($imgUrl, 'http') && !str_starts_with($imgUrl, '/')) {
            $imgUrl = "/oop/images/{$imgUrl}";
        }
        
        return [
            'id' => $this->id,
            'name' => $this->name,
            'brand' => $this->brand,
            'category_id' => $this->category_id,
            'category_name' => $this->category_name,
            'info' => $this->info,
            'price' => $this->price,
            'stock' => $this->stock,
            'img' => $imgUrl,
            'rating' => rand(3, 5),
            'expiration_date' => $this->expiration_date,
            'prescription_required' => $this->prescription_required        
        ];
    }
    

    public static function getById($pdo, $id) {
        $stmt = $pdo->prepare("
            SELECT m.*, c.name as category_name 
            FROM medicines m 
            LEFT JOIN categories c ON m.category_id = c.id 
            WHERE m.id = ?
        ");
        $stmt->execute([$id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        return $data ? new self($data) : null;
    }

        public function getId() {
        return $this->id;
    }

    public static function searchByName($pdo, $name): array {
        $stmt = $pdo->prepare("
            SELECT m.*, c.name as category_name 
            FROM medicines m 
            LEFT JOIN categories c ON m.category_id = c.id 
            WHERE m.name LIKE ?
        ");
        $searchTerm = '%' . $name . '%';
        $stmt->execute([$searchTerm]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return self::fromArrayList($rows);
    }

    public static function handleSearchRequest($pdo) {
        header('Content-Type: application/json');

        $term = $_GET['q'] ?? '';

        if ($term) {
            $results = self::searchByName($pdo, $term);
            $output = array_map(fn($p) => [
                'name' => $p->name,
                'price' => $p->price
            ], $results);
            echo json_encode($output);
        } else {
            echo json_encode([]);
        }
    }

    public function displayDetails(): array {
        return $this->toArray();
    }

    public static function filter(PDO $pdo, string $condition): array {
        $stmt = $pdo->prepare("
            SELECT m.*, c.name as category_name 
            FROM medicines m 
            LEFT JOIN categories c ON m.category_id = c.id 
            WHERE $condition
        ");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return self::fromArrayList($rows);
    }


    public function compare(Product $otherProduct): string {
        if ($this->price > $otherProduct->price) {
            return "{$this->name} is more expensive than {$otherProduct->name}.";
        } elseif ($this->price < $otherProduct->price) {
            return "{$this->name} is cheaper than {$otherProduct->name}.";
        } else {
            return "{$this->name} and {$otherProduct->name} have the same price.";
        }
    }
}
