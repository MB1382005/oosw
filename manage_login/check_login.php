<?php
ob_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
ob_end_clean();
ob_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
error_log('check_login.php: Session status: ' . session_status() . ', Session ID: ' . session_id());
error_log('check_login.php: UserId set: ' . (isset($_SESSION['userId']) ? 'Yes, ID: ' . $_SESSION['userId'] : 'No'));
$isLoggedIn = isset($_SESSION['userId']) && !empty($_SESSION['userId']);
$response = [
    'loggedIn' => $isLoggedIn,
    'userId' => $isLoggedIn ? $_SESSION['userId'] : null,
    'session_id' => session_id(),
    'timestamp' => time()
];
echo json_encode($response);
ob_end_flush();
exit;
