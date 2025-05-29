<?php
require_once 'Database.php';

class Review {
    private int $id;
    private int $user_id;
    private int $medicine_id;
    private int $rating;
    private string $comment;
    private string $created_at;
    private string $user_name;
    private static ?PDO $pdo = null;

    public function __construct($pdo = null) {
        if ($pdo) {
            self::$pdo = $pdo;
        }
    }
    
    public function getId(): int { return $this->id; }
    public function getUserId(): int { return $this->user_id; }
    public function getMedicineId(): int { return $this->medicine_id; }
    public function getRating(): int { return $this->rating; }
    public function getComment(): string { return $this->comment; }
    public function getCreatedAt(): string { return $this->created_at; }
    public function getUserName(): string { return $this->user_name; }
    
    public function setUserId(int $user_id): void { $this->user_id = $user_id; }
    public function setMedicineId(int $medicine_id): void { $this->medicine_id = $medicine_id; }
    public function setRating(int $rating): void { $this->rating = $rating; }
    public function setComment(string $comment): void { $this->comment = $comment; }
    
    public function save(): bool {
        if (!self::$pdo) {
            $db = Database::getInstance();
            self::$pdo = $db->getConnection();
        }
        
        try {
            $stmt = self::$pdo->prepare("
                INSERT INTO reviews (user_id, medicine_id, rating, comment, created_at)
                VALUES (?, ?, ?, ?, NOW())
            ");
            
            return $stmt->execute([
                $this->user_id, 
                $this->medicine_id,
                $this->rating,
                $this->comment
            ]);
        } catch (PDOException $e) {
            error_log("Error saving review: " . $e->getMessage());
            return false;
        }
    }
    
    public static function getProductReviews(int $product_id, int $limit = 10): array {
        if (!self::$pdo) {
            $db = Database::getInstance();
            self::$pdo = $db->getConnection();
        }
        
        try {
            $stmt = self::$pdo->prepare("
                SELECT r.*, u.fname, u.lname 
                FROM reviews r
                JOIN users u ON r.user_id = u.id
                WHERE r.medicine_id = ?
                ORDER BY r.created_at DESC
                LIMIT ?
            ");
            
            $stmt->bindParam(1, $product_id, PDO::PARAM_INT);
            $stmt->bindParam(2, $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            $reviews = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $review = new self();
                $review->id = $row['id'];
                $review->user_id = $row['user_id'];
                $review->medicine_id = $row['medicine_id'];
                $review->rating = $row['rating'];
                $review->comment = $row['comment'];
                $review->created_at = $row['created_at'];
                $review->user_name = $row['fname'] . ' ' . $row['lname'];
                
                $reviews[] = $review;
            }
            
            return $reviews;
        } catch (PDOException $e) {
            error_log("Error getting product reviews: " . $e->getMessage());
            return [];
        }
    }
        public static function getAverageRating(int $product_id): float {
        if (!self::$pdo) {
            $db = Database::getInstance();
            self::$pdo = $db->getConnection();
        }
        
        try {
            $stmt = self::$pdo->prepare("
                SELECT AVG(rating) as avg_rating
                FROM reviews
                WHERE medicine_id = ?
            ");
            
            $stmt->execute([$product_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result['avg_rating'] ? (float)$result['avg_rating'] : 0;
        } catch (PDOException $e) {
            error_log("Error getting average rating: " . $e->getMessage());
            return 0;
        }
    }
    
    public function toArray(): array {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'medicine_id' => $this->medicine_id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'created_at' => $this->created_at,
            'user_name' => $this->user_name
        ];
    }
    
    public static function createFromPost(): ?Review {
        if (!isset($_POST['rating']) || !isset($_POST['comment']) || !isset($_POST['medicine_id'])) {
            return null;
        }
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['userId'])) {
            return null;
        }
        
        $review = new self();
        $review->setUserId($_SESSION['userId']);
        $review->setMedicineId((int)$_POST['medicine_id']);
        $review->setRating((int)$_POST['rating']);
        $review->setComment($_POST['comment']);
        
        return $review;
    }
}
?>