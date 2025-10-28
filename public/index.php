<?php
$twig = require __DIR__ . '/../src/bootstrap.php';

$page = $_GET['page'] ?? 'landing';
$valid = [
  'landing',
  'auth/login',
  'auth/signup',
  'dashboard',
  'tickets'
];

if (!in_array($page, $valid)) {
    $page = 'landing';
}

echo $twig->render($page . '.html.twig', [
  'app_name' => 'TicketApp',
]);


// routing configuration