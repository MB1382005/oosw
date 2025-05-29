<?php 
require_once 'vendor/autoload.php';   
require_once "classes/Database.php"; 
require_once "classes/user.php"; 
 
use Google\Service\Oauth2; 
 
if (session_status() === PHP_SESSION_NONE) { 
    session_start(); 
} 

$config = parse_ini_file(__DIR__ . '/../config.ini');

$client = new Google_Client(); 
$client->setClientId($config['client_id']); 
$client->setClientSecret($config['client_secret']);   
$client->setRedirectUri('http://localhost/oop/oauth2callback.php'); 
$client->addScope(['email', 'profile']); 
 
if (isset($_GET['code'])) { 
    $token = $client->fetchAccessTokenWithAuthCode($_GET['code']); 
    if (isset($token['error'])) { 
        echo "error  " . htmlspecialchars($token['error']); 
        exit; 
    } 
    $client->setAccessToken($token['access_token']); 
    $oauth2 = new Oauth2($client); 
    $userInfo = $oauth2->userinfo->get(); 
 
    $email = $userInfo->email; 
    $fname = $userInfo->givenName ?? null; 
    $lname = $userInfo->familyName ?? null; 
 
    $database = Database::getInstance(); 
    $pdo = $database->getConnection(); 
 
    $user = new User($pdo, $email, 'google_oauth_password', $fname, $lname); 
    $user->registerGmail(); 
    $user->login("gmail"); 
 
    header("Location: http://localhost/oop/home/html/home2.html"); 
    exit; 
} else { 
    echo "error in google"; 
} 
