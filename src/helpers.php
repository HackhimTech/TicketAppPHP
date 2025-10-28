<?php
// simple helpers for file storage and responses

function read_json(string $path) {
    if (!file_exists($path)) return [];
    $json = file_get_contents($path);
    return json_decode($json, true) ?: [];
}

function write_json(string $path, $data) {
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

function send_json($data, int $code = 200) {
    header('Content-Type: application/json');
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function get_request_body() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $d = json_decode($raw, true);
    return $d ?: [];
}

function get_header_token() {
    $headers = getallheaders();
    return $headers['X-Session-Token'] ?? ($headers['x-session-token'] ?? null);
}
