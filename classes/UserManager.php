<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ob_start(); 
require_once 'Database.php';
require_once 'user.php';
require_once 'Product.php';
require_once 'Category.php';


class UserManagerFactory {

    public static function createManager($type = 'default') {
        $db = Database::getInstance();
        $pdo = $db->getConnection();
        
        switch ($type) {
            case 'user':
                return new UserManager($pdo);
            case 'order':
                return new UserOrderManager($pdo);
            case 'product':
                return new ProductManager($pdo);
            default:
                return new UserManager($pdo);
        }
    }
}


abstract class BaseManager {
    protected $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
}


class UserManager extends BaseManager {
    public function getUsers() {
        try {
            $stmt = $this->pdo->query("SELECT id, fname, lname, email, phone, address, is_admin, created_at, platform FROM users");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'data' => $users];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error fetching users: ' . $e->getMessage()];
        }
    }

    public function getUser($id) {
        try {
            $columnsQuery = $this->pdo->query("SHOW COLUMNS FROM users");
            $columns = $columnsQuery->fetchAll(PDO::FETCH_COLUMN);
            error_log('User table columns: ' . implode(', ', $columns));
            
            $selectColumns = "id, fname, lname, email, phone, address, is_admin, created_at, platform";
            if (in_array('role', $columns)) {
                $selectColumns .= ", role";
            }
            
            $stmt = $this->pdo->prepare("SELECT $selectColumns FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user && !isset($user['role']) && isset($user['is_admin'])) {
                $user['role'] = $user['is_admin'] == 1 ? 'admin' : 'customer';
            }
            
            if ($user) {
                error_log('User data found: ' . json_encode($user));
                return ['success' => true, 'data' => $user];
            }
            error_log('User not found with ID: ' . $id);
            return ['success' => false, 'message' => 'User not found'];
        } catch (PDOException $e) {
            error_log('Error in getUser: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error fetching user: ' . $e->getMessage()];
        }
    }

    public function addUser($userData) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO users (fname, lname, email, phone, address, is_admin, created_at, platform)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
            ");

            $result = $stmt->execute([
                $userData['fname'],
                $userData['lname'],
                $userData['email'],
                $userData['phone'] ?? null,
                $userData['address'] ?? null,
                $userData['is_admin'] ?? 0,
                $userData['platform'] ?? 'web'
            ]);

            if ($result) {
                return ['success' => true, 'message' => 'User added successfully'];
            }
            return ['success' => false, 'message' => 'Failed to add user'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error adding user: ' . $e->getMessage()];
        }
    }

    public function updateUser($userId, array $newData = []) {
        try {
            $fields = [];
            $params = [];

            $allowedFields = ['fname', 'lname', 'email', 'phone', 'address', 'is_admin'];
            foreach ($allowedFields as $field) {
                if (isset($newData[$field])) {
                    $fields[] = "$field = ?";
                    $params[] = $newData[$field];
                }
            }

            if (empty($fields)) {
                return ['success' => false, 'message' => 'No valid fields to update'];
            }

            $params[] = $userId;
            $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($params);

            if ($result) {
                return ['success' => true, 'message' => 'User updated successfully'];
            }
            return ['success' => false, 'message' => 'Failed to update user'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error updating user: ' . $e->getMessage()];
        }
    }

    public function deleteUser($id) {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM shopping_cart WHERE user_id = ?");
            $stmt->execute([$id]);

            $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = ?");
            $result = $stmt->execute([$id]);

            if ($result) {
                return ['success' => true, 'message' => 'User deleted successfully'];
            }
            return ['success' => false, 'message' => 'Failed to delete user'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error deleting user: ' . $e->getMessage()];
        }
    }

    public function isAdmin($userId) {
        try {
            $stmt = $this->pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return ['success' => true, 'is_admin' => $result && $result['is_admin'] == 1];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error checking admin status: ' . $e->getMessage()];
        }
    }
    
    public function viewAllUsers() {
        $stmt = $this->pdo->query("SELECT id, lname, fname, email, phone, address, is_admin, created_at, platform FROM users");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "<h2>All Users</h2>";
        echo "<table border='1' cellpadding='5' cellspacing='0'>";
        echo "<tr>
            <th>ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Is Admin</th>
            <th>Created At</th>
            <th>Platform</th>
            </tr>";
        foreach ($users as $user) {
            echo "<tr>";
            echo "<td>{$user['id']}</td>";
            echo "<td>{$user['fname']}</td>";
            echo "<td>{$user['lname']}</td>";
            echo "<td>{$user['email']}</td>";
            echo "<td>{$user['phone']}</td>";
            echo "<td>{$user['address']}</td>";
            echo "<td>" . ($user['is_admin'] ? 'Yes' : 'No') . "</td>";
            echo "<td>{$user['created_at']}</td>";
            echo "<td>{$user['platform']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    public function getUserOrders($userId) {
        try {
            $orderManager = new UserOrderManager($this->pdo);
            
            return $orderManager->getUserOrders($userId);
        } catch (Exception $e) {
            error_log('Error in UserManager->getUserOrders: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error fetching user orders: ' . $e->getMessage(), 'data' => []];
        }
    }
    
    public function getDashboardStats() {
        try {
            $stmt = $this->pdo->query("SELECT COUNT(*) AS id FROM medicines");
            $totalProducts = $stmt->fetch(PDO::FETCH_ASSOC)['id'] ?? 0;

            $stmt = $this->pdo->query("SELECT COUNT(*) AS id FROM orders");
            $totalOrders = $stmt->fetch(PDO::FETCH_ASSOC)['id'] ?? 0;

            $stmt = $this->pdo->query("SELECT COUNT(*) AS id FROM users");
            $totalUsers = $stmt->fetch(PDO::FETCH_ASSOC)['id'] ?? 0;

            $stmt = $this->pdo->query("SELECT SUM(total_price) AS total_sales FROM orders");
            $totalSales = $stmt->fetch(PDO::FETCH_ASSOC)['total_sales'] ?? 0;

            return [
                'success' => true,
                'data' => [
                    'totalProducts' => $totalProducts,
                    'totalOrders' => $totalOrders,
                    'totalUsers' => $totalUsers,
                    'totalSales' => $totalSales
                ]
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error fetching dashboard stats: ' . $e->getMessage()];
        }
    }
}

/**
 * UserOrderManager - Handles order operations
 */
class UserOrderManager extends BaseManager {
    public function getAllOrders() {
        try {
            $stmt = $this->pdo->query("
                SELECT o.*, u.fname, u.lname, u.email 
                FROM orders o 
                LEFT JOIN users u ON o.user_id = u.id 
                ORDER BY o.order_date DESC
            ");
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'data' => $orders];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error fetching orders: ' . $e->getMessage()];
        }
    }

    public function getOrder($id) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT o.*, u.fname, u.lname, u.email 
                FROM orders o 
                LEFT JOIN users u ON o.user_id = u.id 
                WHERE o.id = ?
            ");
            $stmt->execute([$id]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($order) {
                return ['success' => true, 'data' => $order];
            }
            return ['success' => false, 'message' => 'Order not found'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error fetching order: ' . $e->getMessage()];
        }
    }

    public function getUserOrders($userId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT o.*, u.fname, u.lname, u.email 
                FROM orders o 
                LEFT JOIN users u ON o.user_id = u.id 
                WHERE o.user_id = ? 
                ORDER BY o.order_date DESC
            ");
            $stmt->execute([$userId]);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($orders as &$order) {
                $itemsStmt = $this->pdo->prepare("
                    SELECT oi.*, m.name as medicine_name 
                    FROM order_items oi
                    LEFT JOIN medicines m ON oi.medicine_id = m.id
                    WHERE oi.order_id = ?
                ");
                $itemsStmt->execute([$order['id']]);
                $order['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (!isset($order['total_price'])) {
                    $order['total'] = 0;
                    foreach ($order['items'] as $item) {
                        $order['total'] += $item['price'] * $item['quantity'];
                    }
                } else {
                    $order['total'] = $order['total_price'];
                }
            }
            
            return ['success' => true, 'data' => $orders];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error fetching user orders: ' . $e->getMessage()];
        }
    }
    
    public function updateOrder($id, $status) {
        try {
            $stmt = $this->pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
            $result = $stmt->execute([$status, $id]);
            
            if ($result) {
                return ['success' => true, 'message' => 'Order updated successfully'];
            }
            return ['success' => false, 'message' => 'Failed to update order'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error updating order: ' . $e->getMessage()];
        }
    }
    
    public function deleteOrder($id) {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM orders WHERE id = ?");
            $result = $stmt->execute([$id]);
            
            if ($result) {
                return ['success' => true, 'message' => 'Order deleted successfully'];
            }
            return ['success' => false, 'message' => 'Failed to delete order'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error deleting order: ' . $e->getMessage()];
        }
    }
    
    public function addOrder($orderData) {
        try {
            $stmt = $this->pdo->prepare("INSERT INTO orders (user_id, order_date, status, total_price) VALUES (?, ?, ?, ?)");
            $result = $stmt->execute([
                $orderData['user_id'],
                $orderData['order_date'],
                $orderData['status'],
                $orderData['total_price']
            ]);
            
            if ($result) {
                return ['success' => true, 'message' => 'Order added successfully'];
            }
            return ['success' => false, 'message' => 'Failed to add order'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error adding order: ' . $e->getMessage()];
        }
    }
    
    public function viewAllOrders() {
        echo "All Orders:\n";
        $orders = $this->getAllOrders();
        if ($orders['success']) {
            foreach ($orders['data'] as $order) {
                echo "- Order {$order['id']}: {$order['status']} ({$order['total_price']})\n";
            }
        }
    }
}


class ProductManager extends BaseManager {
    public function getProducts() {
        try {
            $stmt = $this->pdo->query("SELECT * FROM medicines");
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'data' => $products];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error fetching products: ' . $e->getMessage()];
        }
    }
    
    public function getProduct($id) {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM medicines WHERE id = ?");
            $stmt->execute([$id]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($product) {
                return ['success' => true, 'data' => $product];
            }
            return ['success' => false, 'message' => 'Product not found'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error fetching product: ' . $e->getMessage()];
        }
    }
    
    public function addProduct($productData) {
        try {
            $stmt = $this->pdo->prepare("INSERT INTO medicines (name, brand, category_id, info, price, stock, image_url, expiration_date, prescription_required, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
            $result = $stmt->execute([
                $productData['name'],
                $productData['brand'],
                $productData['category_id'],
                $productData['info'],
                $productData['price'],
                $productData['stock'],
                $productData['image_url'],
                $productData['expiration_date'],
                $productData['prescription_required'] ?? 0
            ]);
            if ($result) {
                return ['success' => true, 'message' => 'Product added successfully'];
            }
            return ['success' => false, 'message' => 'Failed to add product'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error adding product: ' . $e->getMessage()];
        }
    }
    
    public function updateProduct($productId, array $newData = []) {
        try {
            $fields = ['name', 'brand', 'category_id', 'info', 'price', 'stock', 'image_url', 'expiration_date', 'prescription_required'];
            $set = [];
            $params = [];
            foreach ($fields as $field) {
                if (isset($newData[$field])) {
                    $set[] = "$field = ?";
                    $params[] = $newData[$field];
                }
            }
            if (empty($set)) {
                return ['success' => false, 'message' => 'No valid fields to update'];
            }
            $params[] = $productId;
            $sql = "UPDATE medicines SET ".implode(', ', $set).", updated_at = NOW() WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($params);
            if ($result) {
                return ['success' => true, 'message' => 'Product updated successfully'];
            }
            return ['success' => false, 'message' => 'Failed to update product'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error updating product: ' . $e->getMessage()];
        }
    }
    
    public function deleteProduct($id) {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM medicines WHERE id = ?");
            $result = $stmt->execute([$id]);
            if ($result) {
                return ['success' => true, 'message' => 'Product deleted successfully'];
            }
            return ['success' => false, 'message' => 'Failed to delete product'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Error deleting product: ' . $e->getMessage()];
        }
    }
    
    public function displayDrugInformation(string $info) {
        echo "Drug Information: {$info}\n";
    }
}

if (isset($_GET['test'])) {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'UserManager works!']);
    exit;
}

if (isset($_GET['test_products'])) {
    header('Content-Type: application/json');
    try {
        $manager = UserManagerFactory::createManager('product');
        $result = $manager->getProducts();
        echo json_encode(['success' => true, 'message' => 'Products test successful', 'result' => $result]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Products test failed: ' . $e->getMessage()]);
    }
    exit;
}

if (isset($_GET['check_table'])) {
    header('Content-Type: application/json');
    try {
        $db = Database::getInstance();
        $pdo = $db->getConnection();
        
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        $hasMedicines = in_array('medicines', $tables);
        
        if ($hasMedicines) {
            $columns = $pdo->query("DESCRIBE medicines")->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['success' => true, 'has_table' => true, 'tables' => $tables, 'columns' => $columns]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Table medicines does not exist', 'tables' => $tables]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['action'])) {
        echo json_encode(['success' => false, 'message' => 'No action specified']);
        exit;
    }

    $action = $input['action'];
    
    if (strpos($action, 'Order') !== false) {
        $manager = UserManagerFactory::createManager('order');
        
        if ($action === 'updateOrder') {
            $id = $input['order']['id'];
            $status = $input['order']['status'];
            $result = $manager->updateOrder($id, $status);
            echo json_encode($result);
        } else if ($action === 'deleteOrder') {
            $id = $input['id'];
            $result = $manager->deleteOrder($id);
            echo json_encode($result);
        } else if ($action === 'addOrder') {
            $order = $input['order'];
            $result = $manager->addOrder($order);
            echo json_encode($result);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid order action']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Unknown action']);
    }
    exit;
}

if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    $action = $_GET['action'];
    
    if (in_array($action, ['getUsers', 'getUser', 'addUser', 'updateUser', 'deleteUser', 'isAdmin'])) {
        $manager = UserManagerFactory::createManager('user');
    } else if (in_array($action, ['getAllOrders', 'getOrder', 'getUserOrders'])) {
        $manager = UserManagerFactory::createManager('order');
    } else if (in_array($action, ['getProducts', 'getProduct', 'addProduct', 'updateProduct', 'deleteProduct'])) {
        $manager = UserManagerFactory::createManager('product');
    } else {
        $manager = UserManagerFactory::createManager();
    }
    
    switch ($action) {
        case 'isAdmin':
            if (isset($_GET['userId'])) {
                ob_clean();
                header('Content-Type: application/json');
                echo json_encode($manager->isAdmin($_GET['userId']));
            } else {
                echo json_encode(['success' => false, 'message' => 'User ID is required']);
            }
            break;
            
        case 'getUsers':
            ob_clean();
            header('Content-Type: application/json');
            echo json_encode($manager->getUsers());
            break;
            
        case 'getUser':
            if (isset($_GET['id'])) {
                ob_clean();
                header('Content-Type: application/json');
                echo json_encode($manager->getUser($_GET['id']));
            } else {
                echo json_encode(['success' => false, 'message' => 'User ID is required']);
            }
            break;
            
        case 'addUser':
            if (isset($_GET['data'])) {
                $userData = json_decode(urldecode($_GET['data']), true);
                echo json_encode($manager->addUser($userData));
            } else {
                echo json_encode(['success' => false, 'message' => 'User data is required']);
            }
            break;
            
        case 'updateUser':
            if (isset($_GET['id']) && isset($_GET['data'])) {
                $userData = json_decode(urldecode($_GET['data']), true);
                echo json_encode($manager->updateUser($_GET['id'], $userData));
            } else {
                echo json_encode(['success' => false, 'message' => 'User ID and data are required']);
            }
            break;
            
        case 'deleteUser':
            if (isset($_GET['id'])) {
                echo json_encode($manager->deleteUser($_GET['id']));
            } else {
                echo json_encode(['success' => false, 'message' => 'User ID is required']);
            }
            break;
        
        case 'getAllOrders':
            ob_clean();
            header('Content-Type: application/json');
            echo json_encode($manager->getAllOrders());
            break;
            
        case 'getOrder':
            if (isset($_GET['id'])) {
                ob_clean();
                header('Content-Type: application/json');
                echo json_encode($manager->getOrder($_GET['id']));
            } else {
                echo json_encode(['success' => false, 'message' => 'Order ID is required']);
            }
            break;
            
        case 'getUserOrders':
            if (isset($_GET['userId'])) {
                ob_clean();
                header('Content-Type: application/json');
                echo json_encode($manager->getUserOrders($_GET['userId']));
            } else {
                echo json_encode(['success' => false, 'message' => 'User ID is required']);
            }
            break;
            
        case 'getDashboardStats':
            ob_clean();
            header('Content-Type: application/json');
            echo json_encode($manager->getDashboardStats());
            break;
            
        case 'getProducts':
            ob_clean();
            header('Content-Type: application/json');
            $result = $manager->getProducts();
            echo json_encode($result);
            break;
            
        case 'getProduct':
            if (isset($_GET['id'])) {
                ob_clean();
                header('Content-Type: application/json');
                echo json_encode($manager->getProduct($_GET['id']));
            } else {
                echo json_encode(['success' => false, 'message' => 'Product ID is required']);
            }
            break;
            
        case 'addProduct':
            if (isset($_GET['data'])) {
                $productData = json_decode(urldecode($_GET['data']), true);
                echo json_encode($manager->addProduct($productData));
            } else {
                echo json_encode(['success' => false, 'message' => 'Product data is required']);
            }
            break;
            
        case 'updateProduct':
            if (isset($_GET['id']) && isset($_GET['data'])) {
                $productData = json_decode(urldecode($_GET['data']), true);
                echo json_encode($manager->updateProduct($_GET['id'], $productData));
            } else {
                echo json_encode(['success' => false, 'message' => 'Product ID and data are required']);
            }
            break;
            
        case 'deleteProduct':
            if (isset($_GET['id'])) {
                echo json_encode($manager->deleteProduct($_GET['id']));
            } else {
                echo json_encode(['success' => false, 'message' => 'Product ID is required']);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    exit;
}
?> 