<?php
header('Content-Type: application/json');

try {
    require_once(__DIR__ . "/classes/Database.php");
    require_once(__DIR__ . "/classes/Product.php");

    if (isset($_GET['q'])) {
    $db = Database::getInstance();
    $pdo = $db->getConnection();

        
        if (!$pdo) {
            throw new Exception("Database connection failed");
        }
        
        $term = $_GET['q'];
        $stmt = $pdo->prepare("
            SELECT m.*, c.name as category_name 
            FROM medicines m 
            LEFT JOIN categories c ON m.category_id = c.id 
            WHERE m.name LIKE ?
        ");
        $searchTerm = '%' . $term . '%';
        $stmt->execute([$searchTerm]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $output = array_map(function($p) {
            return [
                'id' => $p['id'],
                'name' => $p['name'],
                'price' => $p['price']
            ];
        }, $results);
        
        echo json_encode($output);
    } else {
        echo json_encode([]);
    }
} catch (Exception $e) {
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
} 