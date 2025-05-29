<?php
require_once 'User.php';
require_once 'Product.php';
require_once 'Payment.php';
require_once 'UserManager.php';

class Customer extends User {
    public string $name;
    public string $address;
    public string $creditInfo;
    public array $wishlist = [];
    protected $pdo;

    public function __construct(PDO $pdo, string $email = '', ?string $password = '', ?string $fname = null, ?string $lname = null) {
        parent::__construct($pdo, $email, $password, $fname, $lname);
        $this->pdo = $pdo;
    }

            
    public function addToWishlist(Product $product) {
        try {
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            
            if (!isset($_SESSION['userId'])) {
                return ['success' => false, 'message' => 'User not logged in'];
            }
            
            if (!$this->isCustomer($_SESSION['userId'])) {
                return ['success' => false, 'message' => 'Access denied. Only customers can add to wishlist'];
            }
            
            $userId = $_SESSION['userId'];
            $productId = $product->getId();
            
            $stmt = $this->pdo->prepare("SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$userId, $productId]);
            
            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Product already in wishlist'];
            }
            
            $stmt = $this->pdo->prepare("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)");
            $result = $stmt->execute([$userId, $productId]);
            
            if ($result) {
                return ['success' => true, 'message' => 'Product added to wishlist successfully'];
            } else {
                return ['success' => false, 'message' => 'Failed to add product to wishlist'];
            }
            
        } catch (Exception $e) {
            error_log('Customer addToWishlist Exception: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error adding to wishlist: ' . $e->getMessage()];
        }
    }

    public function viewOrderHistory() {}
    public function cancelOrder(string $orderId) {}
    public function subscribeMedicineDelivery() {}
    public function referFriend() {}
    public function scanQR() {}
    public function searchByPhoto() {}
    
    public function getProfile() {
        try {
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            error_log('Customer getProfile started, userId: ' . (isset($_SESSION['userId']) ? $_SESSION['userId'] : 'Not Set'));
            if (!isset($_SESSION['userId'])) {
                error_log('Customer getProfile: user not logged in');
                return ['success' => false, 'message' => 'User not logged in'];
            }
            if (!$this->isCustomer($_SESSION['userId'])) {
                error_log('Customer getProfile: Access denied, not a customer');
                return ['success' => false, 'message' => 'Access denied. Only customers can view profiles'];
            }
            $userManager = new UserManager($this->pdo);
            $result = $userManager->getUser($_SESSION['userId']);
            error_log('Customer getProfile: User data - ' . json_encode($result));
            if ($result['success']) {
                $userData = $result['data'];
                $ordersResult = $userManager->getUserOrders($_SESSION['userId']);
                error_log('Customer getProfile: Orders data - ' . json_encode($ordersResult));
                $orders = $ordersResult['success'] ? $ordersResult['data'] : [];
                return [
                    'success' => true,
                    'data' => [
                        'user' => $userData,
                        'orders' => $orders
                    ]
                ];
            } else {
                error_log('Customer getProfile: Failed to fetch user data - ' . ($result['message'] ?? 'Unknown error'));
                return ['success' => false, 'message' => $result['message'] ?? 'Failed to fetch user data'];
            }
        } catch (Exception $e) {
            error_log('Customer getProfile Exception: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error fetching profile: ' . $e->getMessage()];
        }
    }
    
    private function isCustomer($userId) {
        try {
            return true;
            

        } catch (Exception $e) {
            error_log('Customer isCustomer Exception: ' . $e->getMessage());
            return true;
        }
    }
}
?> 