<?php
require_once(__DIR__ . "/Database.php");

class Category {
    public $id;
    public $name;
    public $description;

    private $db;
    public function __construct() {
        $dbObj = Database::getInstance();
        $this->db = $dbObj->getConnection();
    }

    public function save(): bool { 
    if (isset($this->id) && $this->id > 0) { 
        $stmt = $this->db->prepare("UPDATE categories SET name = :name, description = :description WHERE id = :id"); 
        return $stmt->execute([ 
            ':name' => $this->name, 
            ':description' => $this->description, 
            ':id' => $this->id 
        ]); 
    } else { 
        $stmtMax = $this->db->query("SELECT MAX(id) as max_id FROM categories"); 
        $maxId = (int) $stmtMax->fetch(PDO::FETCH_ASSOC)['max_id']; 
        $newId = $maxId + 1;

        $stmt = $this->db->prepare("INSERT INTO categories (id, name, description) VALUES (:id, :name, :description)"); 
        $result = $stmt->execute([ 
            ':id' => $newId,
            ':name' => $this->name, 
            ':description' => $this->description 
        ]); 
        if ($result) { 
            $this->id = $newId; 
        } 
        return $result; 
    } 
}
    public function fetchById(int $id): ?Category {
        $stmt = $this->db->prepare("SELECT * FROM categories WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($data) {
            $this->id = (int)$data['id'];
            $this->name = $data['name'];
            $this->description = $data['description'];
            return $this;
        }
        return null;
    }

    public function delete(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM categories WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    public function fetchAll(): array {
        $stmt = $this->db->query("SELECT * FROM categories");
        $categories = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $category = new Category();
            $category->id = (int)$row['id'];
            $category->name = $row['name'];
            $category->description = $row['description'];
            $categories[] = $category;
        }
        return $categories;
    }

    public function update(int $id, string $name, string $description): bool {
        $stmt = $this->db->prepare("UPDATE categories SET name = :name, description = :description WHERE id = :id");
        return $stmt->execute([
            ':name' => $name,
            ':description' => $description,
            ':id' => $id
        ]);
    }

}

if (isset($_GET['action']) && $_GET['action'] === 'all') {
    if (ob_get_level()) ob_end_clean();
    header('Content-Type: application/json');
    $cat = new Category();
    echo json_encode($cat->fetchAll());
    exit;
}

if (isset($_GET['action']) && $_GET['action'] === 'get' && isset($_GET['id'])) {
    if (ob_get_level()) ob_end_clean();
    header('Content-Type: application/json');
    $cat = new Category();
    echo json_encode($cat->fetchById((int)$_GET['id']));
    exit;
}

