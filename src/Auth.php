<?php
namespace App;

class Auth {
    private string $usersFile;
    private string $sessionsFile;

    public function __construct(string $usersFile, string $sessionsFile) {
        $this->usersFile = $usersFile;
        $this->sessionsFile = $sessionsFile;
    }

    private function readUsers() {
        $data = @file_get_contents($this->usersFile);
        return $data ? json_decode($data, true) : [];
    }

    private function writeUsers($users) {
        file_put_contents($this->usersFile, json_encode($users, JSON_PRETTY_PRINT));
    }

    private function readSessions() {
        $data = @file_get_contents($this->sessionsFile);
        return $data ? json_decode($data, true) : [];
    }

    private function writeSessions($sessions) {
        file_put_contents($this->sessionsFile, json_encode($sessions, JSON_PRETTY_PRINT));
    }

    public function findUser($username, $password) {
        $users = $this->readUsers();
        foreach ($users as $u) {
            if ($u['username'] === $username && $u['password'] === $password) {
                return $u;
            }
        }
        return null;
    }

    public function signup($username, $password, $name) {
        $users = $this->readUsers();
        foreach ($users as $u) {
            if ($u['username'] === $username) {
                return null;
            }
        }
        $new = [
            'id' => uniqid('user_'),
            'username' => $username,
            'password' => $password,
            'name' => $name
        ];
        $users[] = $new;
        $this->writeUsers($users);
        return $new;
    }

    public function createSession($user) {
        $sessions = $this->readSessions();
        $token = bin2hex(random_bytes(16));
        $session = [
            'token' => $token,
            'user' => ['id' => $user['id'], 'username' => $user['username'], 'name' => $user['name']],
            'created_at' => date(DATE_ATOM),
            // expiration (24h)
            'expires_at' => date(DATE_ATOM, time() + 86400)
        ];
        $sessions[$token] = $session;
        $this->writeSessions($sessions);
        return $session;
    }

    public function validateToken($token) {
        if (!$token) return null;
        $sessions = $this->readSessions();
        if (!isset($sessions[$token])) return null;
        $s = $sessions[$token];
        if (isset($s['expires_at']) && strtotime($s['expires_at']) < time()) {
            // expired
            unset($sessions[$token]);
            $this->writeSessions($sessions);
            return null;
        }
        return $s;
    }

    public function destroySession($token) {
        $sessions = $this->readSessions();
        if (isset($sessions[$token])) {
            unset($sessions[$token]);
            $this->writeSessions($sessions);
        }
    }
}
