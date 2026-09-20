<?php
$hostName   = "localhost";
$dbUser     = "CHANGE_ME_db_user";      /
$dbPassword = "CHANGE_ME_db_password";  
$dbName     = "CHANGE_ME_db_name";

$conn = mysqli_connect($hostName, $dbUser, $dbPassword, $dbName);
if (!$conn) {
    die("Something went wrong");
}