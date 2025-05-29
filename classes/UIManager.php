<?php
class UIManager {
    public function toggleDarkMode() {
        if (isset($_COOKIE['dark_mode']) && $_COOKIE['dark_mode'] === '1') {
            setcookie('dark_mode', '0', time() + (86400 * 30), "/"); 
        } else {
            setcookie('dark_mode', '1', time() + (86400 * 30), "/"); 
        }

        header("Location: " . $_SERVER['PHP_SELF']);
        exit();
    }
}
?>
