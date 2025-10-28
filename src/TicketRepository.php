<?php
namespace App;

class TicketRepository {
    private string $file;

    public function __construct(string $file) {
        $this->file = $file;
        if (!file_exists($this->file)) {
            file_put_contents($this->file, json_encode([], JSON_PRETTY_PRINT));
        }
    }

    public function all() {
        $raw = file_get_contents($this->file);
        return json_decode($raw, true) ?: [];
    }

    private function saveAll($tickets) {
        file_put_contents($this->file, json_encode($tickets, JSON_PRETTY_PRINT));
    }

    public function find($id) {
        $t = $this->all();
        foreach ($t as $item) if ($item['id'] === $id) return $item;
        return null;
    }

    public function create($data) {
        $tickets = $this->all();
        $now = date(DATE_ATOM);
        $ticket = [
            'id' => uniqid('t_'),
            'title' => $data['title'] ?? '',
            'description' => $data['description'] ?? '',
            'status' => $data['status'] ?? 'open',
            'priority' => $data['priority'] ?? 'medium',
            'created_at' => $now,
            'updated_at' => $now,
            'owner' => $data['owner'] ?? null
        ];
        array_unshift($tickets, $ticket);
        $this->saveAll($tickets);
        return $ticket;
    }

    public function update($id, $data) {
        $tickets = $this->all();
        foreach ($tickets as &$t) {
            if ($t['id'] === $id) {
                $t = array_merge($t, $data);
                $t['updated_at'] = date(DATE_ATOM);
                $this->saveAll($tickets);
                return $t;
            }
        }
        return null;
    }

    public function delete($id) {
        $tickets = $this->all();
        $filtered = array_filter($tickets, fn($t) => $t['id'] !== $id);
        $this->saveAll(array_values($filtered));
        return true;
    }
}
