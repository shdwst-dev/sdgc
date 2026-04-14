<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://127.0.0.1:8000/api/v1/productos/1");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$output = curl_exec($ch);
curl_close($ch);
file_put_contents('curl_output.txt', $output);
