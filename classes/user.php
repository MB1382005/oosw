<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once(__DIR__ . "/Database.php");
require_once __DIR__ . '/../vendor/autoload.php';

use Google\Client as Google_Client;
use Google\Service\Oauth2 as Google_Service_Oauth2;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$db = Database::getInstance();
$pdo = $db->getConnection();

class User {
    private PDO $conn;
    private string $email;
    private ?string $password; 
    private bool $loginStatus = false;
    private ?int $id = null; 
    private ?string $fname = null;
    private ?string $lname = null;
    private ?string $platform = null;
    private ?string $resetToken = null;
    private ?string $resetCode = null;
    

    public function __construct(PDO $db, string $email = '', ?string $password = '', ?string $fname = null, ?string $lname = null) {
        $this->conn = $db;
        $this->email = $email;
        $this->password = $password;
        $this->fname = $fname;
        $this->lname = $lname;
    }

    private function register(string $platform): bool {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE email = ? AND platform = ?");
            $stmt->execute([$this->email, $platform]);

            if ($stmt->rowCount() > 0) {
                echo "Email already registered on $platform.<br>";
                return false;
            }

            $hashedPassword = null;
            if (!empty($this->password)) {
                $hashedPassword = password_hash($this->password, PASSWORD_DEFAULT);
            }

            $insert = $this->conn->prepare("INSERT INTO users (email, password, platform, fname, lname) VALUES (?, ?, ?, ?, ?)");
            $insert->execute([$this->email, $hashedPassword, $platform, $this->fname, $this->lname]);

            $this->id = (int)$this->conn->lastInsertId();

            echo "Registration successful via " . ucfirst($platform) . ".<br>";
            return true;
        } catch (PDOException $e) {
            error_log("Registration error: " . $e->getMessage()); 
            echo "Registration failed. Please try again later.<br>";
            return false;
        }
    }

    public function registerGmail(): bool {
        return $this->register('gmail');
    }

    public function registerFacebook(): bool {
        return $this->register('facebook');
    }

    public function login(): bool {
        $platforms = ['web', 'gmail', 'facebook'];
        foreach ($platforms as $platform) {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE email = ? AND platform = ?");
            $stmt->execute([$this->email, $platform]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                if (!empty($user['password'])) {
                    if (password_verify($this->password, $user['password'])) {
                        $this->loginStatus = true;
                        $this->id = $user['id'];
                        $_SESSION['userId'] = $this->id;
                        echo "Login successful via " . ucfirst($platform) . ".<br>";
                        return true;
                    }
                } else {
                    $this->loginStatus = true;
                    $this->id = $user['id'];
                    $_SESSION['userId'] = $this->id;
                    echo "Login successful via " . ucfirst($platform) . " (no password).<br>";
                    return true;
                }
            }
        }
        echo "Login failed. Check your credentials.<br>";
        return false;
    }

    public function loginFacebook(): bool {
        return $this->login('facebook');
    }

    public function verifyLogin(): bool {
        return $this->loginStatus;
    }

    public function getId(): ?int { 
        return $this->id;
    }

    public function sendPasswordResetToken(): bool {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$this->email]);

            if ($stmt->rowCount() === 0) {
                echo "Email not found in the database.<br>";
                return false;
            }

            $code = random_int(100000, 999999);

            $update = $this->conn->prepare("UPDATE users SET reset_token = ? WHERE email = ?");
            $update->execute([$code, $this->email]);

            $emailBody = "Hello,<br>Your password reset code is: <b>$code</b><br>Please enter it in the password reset page.";

            $mail = new PHPMailer(true);

           $config = parse_ini_file(__DIR__ . '/../config.ini');

            $mail->isSMTP(); 
            $mail->Host = 'smtp.gmail.com'; 
            $mail->SMTPAuth = true; 
            $mail->Username = $config['smtp_username'];  
            $mail->Password = $config['smtp_password'];  
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; 
            $mail->Port = 587;


            $mail->setFrom('hm1757907@gmail.com', 'Your App');
            $mail->addAddress($this->email);

            $mail->isHTML(true);
            $mail->Subject = 'Password Reset Code';
            $mail->Body = $emailBody;

            $mail->SMTPDebug = 0; 

            $mail->send();
            echo "Password reset code has been sent to your email.";
            return true;
        } catch (PDOException $e) {
            error_log("Database error in sendPasswordResetToken: " . $e->getMessage());
            echo "Failed to send reset token (database error). Please try again later.";
            return false;
        } catch (Exception $e) {
            error_log("Failed to send email: {$mail->ErrorInfo}");
            echo "Failed to send email. Mailer Error: {$mail->ErrorInfo}";
            return false;
        }
    }

    public function resetPasswordWithToken(string $token, string $newPassword): bool {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE reset_token = ?");
            $stmt->execute([$token]);

            if ($stmt->rowCount() === 0) {
                echo "Invalid reset code.<br>";
                return false;
            }

            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $update = $this->conn->prepare("UPDATE users SET password = ?, reset_token = NULL WHERE reset_token = ?");
            $update->execute([$hashedPassword, $token]);

            echo "Password changed successfully.<br>";
            return true;
        } catch (PDOException $e) {
            error_log("Reset password error: " . $e->getMessage());
            echo "Failed to reset password. Please try again later.<br>";
            return false;
        }
    }

    public function verifyResetToken(string $token): bool {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE email = ? AND reset_token = ?");
            $stmt->execute([$this->email, $token]);

            if ($stmt->rowCount() > 0) {
                return true;
            }
            return false;
        } catch (PDOException $e) {
            error_log("Verify reset token error: " . $e->getMessage());
            return false;
        }
    }

    public function userExists(string $email): bool {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$email]);
            return $stmt->rowCount() > 0;
        } catch (PDOException $e) {
            error_log("User exists check error: " . $e->getMessage());
            return false;
        }
    }
}

function getGoogleClient(): Google_Client { 
    $config = parse_ini_file(__DIR__ . '/../config.ini');

    $client = new Google_Client(); 
    $client->setRedirectUri('http://localhost/oop/oauth2callback.php'); 
    $client->setClientId($config['client_id']);  
    $client->setClientSecret($config['client_secret']);  
    $client->addScope('email'); 
    $client->addScope('profile'); 
    return $client; 
}


if (isset($_POST['signUp'])) {
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $password = $_POST['password']; 
    $fname = isset($_POST['fname']) ? htmlspecialchars($_POST['fname']) : null;
    $lname = isset($_POST['lname']) ? htmlspecialchars($_POST['lname']) : null;

    $user = new User($pdo, $email, $password, $fname, $lname);
    if ($user->registerGmail()) {
        // header("Location: registration_success.php");
        // exit;
    }
    exit;
}

if (isset($_POST['signIn'])) {
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $password = $_POST['password'];

    $user = new User($pdo, $email, $password);
    if ($user->login()) {
        header("Location: http://localhost/oop/home/html/home2.html");
    }
    exit;
}

if (isset($_GET['google_oauth']) && isset($_GET['code'])) {
    $client = getGoogleClient();
    try {
        $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);

        if (isset($token['error'])) {
            echo "OAuth Error: " . htmlspecialchars($token['error_description']);
            exit;
        }

        $client->setAccessToken($token['access_token']);
        $google_oauth = new Google_Service_Oauth2($client);
        $info = $google_oauth->userinfo->get();

        $email = $info->email;
        $fname = $info->givenName;
        $lname = $info->familyName;

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND platform = 'gmail'");
        $stmt->execute([$email]);

        if ($stmt->rowCount() === 0) {
            $user = new User($pdo, $email, null, $fname, $lname); 
            if ($user->registerGmail()) {
                $_SESSION['userId'] = $user->getId();
            } else {

                echo "Google OAuth registration failed.";
                exit;
            }
        } else {
            $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
            $_SESSION['userId'] = $existingUser['id']; 

            $user = new User($pdo, $email, null, $fname, $lname); 
            $user->login();
        }

        header("Location: http://localhost/oop/home/html/home2.html");
        exit;
    } catch (Exception $e) {
        error_log("Google OAuth processing error: " . $e->getMessage());
        echo "An error occurred during Google login. Please try again.";
        exit;
    }
}

if (isset($_GET['google_login'])) {
    $client = getGoogleClient();
    $authUrl = $client->createAuthUrl();
    header('Location: ' . filter_var($authUrl, FILTER_SANITIZE_URL));
    exit;
}

if (isset($_POST['forgot_password'])) {
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $user = new User($pdo, $email);
    $user->sendPasswordResetToken();
    exit;
}

if (isset($_POST['reset_password_submit'])) {
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $token = $_POST['token'];
    $newPassword = $_POST['new_password'];

    $user = new User($pdo, $email);
    if ($user->verifyResetToken($token)) {
        if ($user->resetPasswordWithToken($token, $newPassword)) {
            // header("Location: login.php");
            // exit;
        }
    } else {
        echo "Invalid or expired reset token for this email.<br>";
    }
    exit;
}
?>