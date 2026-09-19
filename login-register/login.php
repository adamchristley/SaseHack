<?php
session_start();
if(isset($_SESSION["user"])){
    header("Location: index.php");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Form</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class ="container">
    <?php
    if(isset($_POST["login"])){
        $email = $_POST["email"];
        $password = $_POST["password"];
        require_once "database.php";
        $sql = "SELECT * FROM users WHERE email = '$email'";
        $result = mysqli_query($conn, $sql);
        $user = mysqli_fetch_array($result, MYSQLI_ASSOC);
        if($user){
            if(password_verify($password, $user["password"])){
               
                header("Loction: index.php");
                die();
            }else{
                echo "<div class='alert alert-danger'> Password does not match</div>";
            }
            }else{
                echo "<div class='alert alert-danger'> Email does not exist</div>";
            }
        }
?>

        <form action="login.php" method="post">
            <div class="form-group">
                <input type="email" placeholder="Enter Email:" name ="email" class="form-control">
            </div>
            <div class="form-group">
                <input type ="password" placeholder="Enter Password:" name="password" class="form-control">
                 </div>
            <div class="form-btn">
                <input type ="submit" value="Login:" name="login" class="btn btn-primary">
            </div>
            </form>
            <div><p>Not registered yet <a href="registration.php">Register Here</a></p></div>
            </div>
</body>
</html>