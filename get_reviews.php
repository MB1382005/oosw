<?php
ob_start();

require_once 'classes/Review.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit(0);
}

try {
    if (!isset($_GET['product_id']) || !is_numeric($_GET['product_id'])) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid product ID']);
        exit;
    }
    
    $productId = (int)$_GET['product_id'];
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 10;
    
    $reviews = Review::getProductReviews($productId, $limit);
    $averageRating = Review::getAverageRating($productId);
    
    $reviewsArray = [];
    foreach ($reviews as $review) {
        $reviewsArray[] = $review->toArray();
    }
    
    $unexpectedOutput = ob_get_clean();
    if (!empty($unexpectedOutput)) {
        error_log('Unexpected output in get_reviews.php: ' . $unexpectedOutput);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Reviews retrieved successfully',
        'reviews' => $reviewsArray,
        'count' => count($reviewsArray),
        'average_rating' => $averageRating
    ]);
    
} catch (Exception $e) {
    ob_end_clean();
    error_log('Error in get_reviews.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
exit;
