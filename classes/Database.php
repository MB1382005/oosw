<?php
class Database
{
    private static $instance = null;
    private $conn;

    private $host = 'localhost';
    private $db_name = 'pharmacy_db';
    private $username = 'root';
    private $password = '';

    private function __construct()
    {
        try {
            $socket = @fsockopen($this->host, 3306, $errno, $errstr, 5);
            if (!$socket) {
                throw new Exception("MySQL server is not running or not accessible");
            }
            fclose($socket);

            $dsn = "mysql:host={$this->host};charset=utf8";
            $tempConn = new PDO($dsn, $this->username, $this->password);
            $tempConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            $dbExists = $tempConn->query(
                "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '{$this->db_name}'"
            )->rowCount() > 0;

            if (!$dbExists) {
                $tempConn->exec(
                    "CREATE DATABASE IF NOT EXISTS {$this->db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                );
            }

            $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        } catch (PDOException $e) {
            throw new Exception('Database connection error: ' . $e->getMessage());
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        return $this->conn;
    }
}
?>