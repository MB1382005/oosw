<?php
require_once __DIR__ . '/../classes/user.php';

$step = 1;

if (isset($_POST['send_token'])) {
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $user = new User($pdo, $email);
    if ($user->sendPasswordResetToken()) {
        $step = 2;
        $sent_email = $email;
    } else {
        $error = "Email not found in the database.";
    }
} elseif (isset($_POST['verify_token'])) {
    $token = $_POST['token'];
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $user = new User($pdo, $email);
    if ($user->verifyResetToken($token)) {
        $step = 3;
        $verified_token = $token;
        $verified_email = $email;
    } else {
        $error = "Invalid token.";
        $step = 2;
        $sent_email = $email;
    }
} elseif (isset($_POST['reset_password'])) {
    $token = $_POST['token'];
    $email = $_POST['email'];
    $newPassword = $_POST['new_password'];
    $confirmPassword = $_POST['confirm_password'];
    
    if ($newPassword !== $confirmPassword) {
        $error = "Passwords do not match.";
        $step = 3;
        $verified_token = $token;
        $verified_email = $email;
    } else {
        $user = new User($pdo, $email);
        if ($user->resetPasswordWithToken($token, $newPassword)) {
            $success = "Password has been reset successfully. You can now login with your new password.";
            $step = 1;
        } else {
            $error = "Invalid token or password reset failed.";
            $step = 3;
            $verified_token = $token;
            $verified_email = $email;
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
            width: 100%;
            max-width: 400px;
        }
        h2 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
        }
        button:hover {
            background-color: #45a049;
        }
        .error {
            color: #f44336;
            margin-bottom: 20px;
            text-align: center;
        }
        .success {
            color: #4CAF50;
            margin-bottom: 20px;
            text-align: center;
        }
        .steps {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .step {
            flex: 1;
            text-align: center;
            padding: 10px;
            background-color: #eee;
            margin: 0 5px;
            border-radius: 4px;
        }
        .step.active {
            background-color: #4CAF50;
            color: white;
        }
        .back-to-login {
            text-align: center;
            margin-top: 20px;
        }
        .back-to-login a {
            color: #4CAF50;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Reset Password</h2>
        
        <div class="steps">
            <div class="step <?php echo $step === 1 ? 'active' : ''; ?>">1. Email</div>
            <div class="step <?php echo $step === 2 ? 'active' : ''; ?>">2. Verify Code</div>
            <div class="step <?php echo $step === 3 ? 'active' : ''; ?>">3. New Password</div>
        </div>
        
        <?php if (!empty($error)): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <?php if (!empty($success)): ?>
            <div class="success"><?php echo $success; ?></div>
        <?php endif; ?>

        <?php if ($step === 1): ?>
            <form method="post" action="">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" name="email" id="email" required>
                </div>
                <button type="submit" name="send_token">Send Reset Code</button>
            </form>
        <?php elseif ($step === 2): ?>
            <form method="post" action="">
                <input type="hidden" name="email" value="<?php echo htmlspecialchars($sent_email); ?>">
                <div class="form-group">
                    <label for="token">Enter the 6-digit code sent to your email:</label>
                    <input type="text" name="token" id="token" required>
                </div>
                <button type="submit" name="verify_token">Verify Code</button>
            </form>
        <?php elseif ($step === 3): ?>
            <form method="post" action="">
                <input type="hidden" name="email" value="<?php echo htmlspecialchars($verified_email); ?>">
                <input type="hidden" name="token" value="<?php echo htmlspecialchars($verified_token); ?>">
                <div class="form-group">
                    <label for="new_password">New Password:</label>
                    <input type="password" name="new_password" id="new_password" required minlength="6">
                </div>
                <div class="form-group">
                    <label for="confirm_password">Confirm Password:</label>
                    <input type="password" name="confirm_password" id="confirm_password" required minlength="6">
                </div>
                <button type="submit" name="reset_password">Reset Password</button>
            </form>
        <?php endif; ?>
        
        <?php if (!empty($success)): ?>
            <script>
            setTimeout(function() {
                window.location.href = "login/login/login.html";
            }, 2000);
            </script>
        <?php else: ?>
        <div class="back-to-login">
            <a href="login\login\login.html">Back to Login</a>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>
