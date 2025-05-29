<?php
session_start();
require_once 'Database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['userId'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || empty($data['current_password']) || empty($data['new_password'])) {
    echo json_encode(['success' => false, 'message' => 'Missing data']);
    exit;
}

    $db = Database::getInstance();
    $pdo = $db->getConnection();

$stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
$stmt->execute([$_SESSION['userId']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($data['current_password'], $user['password'])) {
    echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
    exit;
}

$newHashed = password_hash($data['new_password'], PASSWORD_DEFAULT);
$update = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
$update->execute([$newHashed, $_SESSION['userId']]);

echo json_encode(['success' => true, 'message' => 'Password changed successfully']); 