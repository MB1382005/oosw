<?php
error_reporting(0);
ini_set('display_errors', 0);
ob_start();

require_once __DIR__ . '/../classes/Database.php';
header('Content-Type: application/json');

$from = $_GET['from'] ?? null;
$to = $_GET['to'] ?? null;

if (!$from || !$to) {
    ob_clean();
    echo json_encode(['success' => false, 'message' => 'Please select a date range']);
    exit;
}

if (!validateDate($from) || !validateDate($to)) {
    ob_clean();
    echo json_encode(['success' => false, 'message' => 'Invalid date format']);
    exit;
}

if (strtotime($from) > strtotime($to)) {
    ob_clean();
    echo json_encode(['success' => false, 'message' => 'From date cannot be after To date']);
    exit;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    if (!$conn) {
        throw new PDOException("Failed to establish database connection");
    }

    $stmt = $conn->prepare("
        SELECT 
            COUNT(*) AS total_orders,
            SUM(total_price) AS total_sales,
            COUNT(DISTINCT user_id) AS unique_customers,
            AVG(total_price) AS average_order_value
        FROM orders 
        WHERE order_date BETWEEN ? AND ?
    ");
    
    if (!$stmt->execute([$from, $to])) {
        throw new PDOException("Failed to execute summary query: " . implode(" ", $stmt->errorInfo()));
    }
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);

    $topStmt = $conn->prepare("
        SELECT 
            m.name,
            SUM(oi.quantity) AS total_sold,
            SUM(oi.quantity * oi.price) AS total_revenue
        FROM order_items oi
        JOIN medicines m ON oi.medicine_id = m.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.order_date BETWEEN ? AND ?
        GROUP BY m.name
        ORDER BY total_sold DESC
        LIMIT 3
    ");
    
    if (!$topStmt->execute([$from, $to])) {
        throw new PDOException("Failed to execute top products query: " . implode(" ", $topStmt->errorInfo()));
    }
    $topProducts = $topStmt->fetchAll(PDO::FETCH_ASSOC);

    $trendStmt = $conn->prepare("
        SELECT 
            DATE(order_date) as date,
            COUNT(*) as orders,
            SUM(total_price) as sales
        FROM orders 
        WHERE order_date BETWEEN ? AND ?
        GROUP BY DATE(order_date)
        ORDER BY date
    ");
    
    if (!$trendStmt->execute([$from, $to])) {
        throw new PDOException("Failed to execute sales trend query: " . implode(" ", $trendStmt->errorInfo()));
    }
    $salesTrend = $trendStmt->fetchAll(PDO::FETCH_ASSOC);

    ob_clean();
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'total_orders' => (int)($summary['total_orders'] ?? 0),
            'total_sales' => number_format($summary['total_sales'] ?? 0, 2),
            'unique_customers' => (int)($summary['unique_customers'] ?? 0),
            'average_order_value' => number_format($summary['average_order_value'] ?? 0, 2),
            'top_products' => $topProducts,
            'sales_trend' => $salesTrend
        ]
    ]);

} catch (PDOException $e) {
    ob_clean();
    error_log("Database Error in generate_report.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Database error occurred',
        'debug' => [
            'error' => $e->getMessage(),
            'code' => $e->getCode()
        ]
    ]);
} catch (Exception $e) {
    ob_clean();
    error_log("General Error in generate_report.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Error generating report',
        'debug' => [
            'error' => $e->getMessage(),
            'code' => $e->getCode()
        ]
    ]);
}

function validateDate($date) {
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}
?>
