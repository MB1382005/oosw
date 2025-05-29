<?php
ob_start();

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
header('Content-Type: application/json');
session_start();

try {
    error_log("Session userId: " . (isset($_SESSION['userId']) ? $_SESSION['userId'] : 'not set'));

    if (!isset($_SESSION['userId'])) {
        ob_end_clean(); 
        echo json_encode(['success' => false, 'is_admin' => false, 'message' => 'No user session']);
        exit;
    }

    require_once __DIR__ . '/Database.php';
    require_once __DIR__ . '/UserManager.php';

    $db = Database::getInstance();
    $pdo = $db->getConnection();

    $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['userId']]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    error_log("Database result for user " . $_SESSION['userId'] . ": " . print_r($result, true));
    
    $unexpectedOutput = ob_get_clean();
    if (!empty($unexpectedOutput)) {
        error_log('Unexpected output in checkAdmin.php: ' . $unexpectedOutput);
    }
    
    echo json_encode([
        'success' => true,
        'is_admin' => $result && $result['is_admin'] == 1,
        'debug' => [
            'user_id' => $_SESSION['userId'],
            'db_result' => $result
        ]
    ]);
} catch (Exception $e) {
    ob_end_clean(); 
    error_log("Error in checkAdmin.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error checking admin status: ' . $e->getMessage()
    ]);
}
exit; 