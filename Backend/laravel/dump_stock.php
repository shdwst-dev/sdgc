<?php
try {
    $db = new PDO("pgsql:host=127.0.0.1;port=5432;dbname=sdgc", "postgres", "KarolIvan2006");
    $stmt = $db->query("SELECT * FROM stock;");
    file_put_contents('stock_dump.json', json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT));
} catch (Exception $e) {
    file_put_contents('stock_dump.json', $e->getMessage());
}
