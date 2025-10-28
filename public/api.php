<?php
require_once __DIR__ . '/../src/helpers.php';
require_once __DIR__ . '/../vendor/autoload.php';

use App\Auth;
use App\TicketRepository;

$usersFile = __DIR__ . '/../storage/users.json';
$ticketsFile = __DIR__ . '/../storage/tickets.json';
$sessionsFile = __DIR__ . '/../storage/sessions.json';

$auth = new Auth($usersFile, $sessionsFile);
$tickets = new TicketRepository($ticketsFile);

$action = $_GET['action'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'login':
        if ($method !== 'POST') send_json(['error' => 'Method not allowed'], 405);
        $body = get_request_body();
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');
        if (!$username || !$password) send_json(['error' => 'Username and password required'], 400);
        $user = $auth->findUser($username, $password);
        if (!$user) send_json(['error' => 'Invalid credentials'], 401);
        $session = $auth->createSession($user);
        // return session object — client should store it as ticketapp_session
        send_json(['session' => $session]);
        break;

    case 'signup':
        if ($method !== 'POST') send_json(['error' => 'Method not allowed'], 405);
        $body = get_request_body();
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');
        $name = trim($body['name'] ?? '');
        if (!$username || !$password || !$name) send_json(['error' => 'Name, username and password required'], 400);
        // create user
        $created = $auth->signup($username, $password, $name);
        if (!$created) send_json(['error' => 'User already exists'], 409);
        $session = $auth->createSession($created);
        send_json(['session' => $session]);
        break;

    case 'logout':
        if ($method !== 'POST') send_json(['error' => 'Method not allowed'], 405);
        $token = get_header_token();
        if ($token) $auth->destroySession($token);
        send_json(['ok' => true]);
        break;

    case 'tickets':
        // protected routes: require token
        $token = get_header_token();
        $sess = $auth->validateToken($token);
        if (!$sess) send_json(['error' => 'Unauthorized - invalid or expired session'], 401);

        if ($method === 'GET') {
            $all = $tickets->all();
            // optionally filter by owner?
            send_json(['tickets' => $all]);
        } elseif ($method === 'POST') {
            $body = get_request_body();
            // validate
            $title = trim($body['title'] ?? '');
            $status = trim($body['status'] ?? '');
            $allowed = ['open','in_progress','closed'];
            if (!$title) send_json(['error' => 'Title is required'], 400);
            if (!in_array($status, $allowed)) send_json(['error' => 'Invalid status'], 400);
            $payload = [
                'title' => $title,
                'description' => trim($body['description'] ?? ''),
                'status' => $status,
                'priority' => $body['priority'] ?? 'medium',
                'owner' => $sess['user']['username']
            ];
            $created = $tickets->create($payload);
            send_json(['ticket' => $created], 201);
        } else {
            send_json(['error' => 'Method not allowed'], 405);
        }
        break;

    case 'ticket':
        $token = get_header_token();
        $sess = $auth->validateToken($token);
        if (!$sess) send_json(['error' => 'Unauthorized - invalid or expired session'], 401);

        $id = $_GET['id'] ?? null;
        if (!$id) send_json(['error' => 'Missing ticket id'], 400);

        if ($method === 'PUT') {
            $body = get_request_body();
            $allowed = ['open','in_progress','closed'];
            if (isset($body['status']) && !in_array($body['status'], $allowed)) send_json(['error' => 'Invalid status'], 400);
            if (isset($body['title']) && trim($body['title']) === '') send_json(['error' => 'Title cannot be empty'], 400);
            $payload = [];
            if (isset($body['title'])) $payload['title'] = trim($body['title']);
            if (isset($body['description'])) $payload['description'] = trim($body['description']);
            if (isset($body['status'])) $payload['status'] = $body['status'];
            $updated = $tickets->update($id, $payload);
            if (!$updated) send_json(['error' => 'Ticket not found'], 404);
            send_json(['ticket' => $updated]);
        } elseif ($method === 'DELETE') {
            $tickets->delete($id);
            send_json(['ok' => true]);
        } else {
            send_json(['error' => 'Method not allowed'], 405);
        }

        break;

    default:
        send_json(['error' => 'Unknown action'], 400);
}
