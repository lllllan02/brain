// A single-writer teaching example. No model, embedding, or network dependency.
package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type Scope struct {
	User    string `json:"user"`
	Project string `json:"project"`
}

type Memory struct {
	Scope     Scope      `json:"scope"`
	Key       string     `json:"key"`
	Value     string     `json:"value,omitempty"`
	Source    string     `json:"source,omitempty"`
	Version   int        `json:"version"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	Deleted   bool       `json:"deleted,omitempty"`
}

func load(path string) ([]Memory, error) {
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return []Memory{}, nil
	}
	if err != nil {
		return nil, err
	}
	var rows []Memory
	err = json.Unmarshal(data, &rows)
	return rows, err // A corrupt store must not silently become an empty store.
}

func save(path string, rows []Memory) error {
	data, err := json.MarshalIndent(rows, "", "  ")
	if err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".memory-*.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if _, err := f.Write(data); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(f.Name(), path)
}

func find(rows []Memory, scope Scope, key string) int {
	for i, m := range rows {
		if m.Scope == scope && m.Key == key {
			return i
		}
	}
	return -1
}

func run() error {
	path := flag.String("file", "memory.json", "JSON store; parent directory must exist")
	action := flag.String("action", "get", "get, put, or delete")
	user := flag.String("user", "alice", "demo scope; real applications bind authenticated identity")
	project := flag.String("project", "demo", "project scope")
	key := flag.String("key", "example_language", "exact lookup key")
	value := flag.String("value", "", "already validated candidate value")
	source := flag.String("source", "", "source message ID for put")
	expected := flag.Int("version", 0, "expected current version; 0 only for a new key")
	expires := flag.String("expires", "", "optional RFC3339 expiration time")
	flag.Parse()
	if *user == "" || *project == "" || *key == "" || *expected < 0 {
		return errors.New("nonempty scope/key and nonnegative version required")
	}
	rows, err := load(*path)
	if err != nil {
		return err
	}
	scope := Scope{User: *user, Project: *project}
	i := find(rows, scope, *key)
	current := 0
	if i >= 0 {
		current = rows[i].Version
	}
	if *action == "get" {
		var result *Memory
		if i >= 0 && !rows[i].Deleted &&
			(rows[i].ExpiresAt == nil || time.Now().Before(*rows[i].ExpiresAt)) {
			result = &rows[i]
		}
		return json.NewEncoder(os.Stdout).Encode(result)
	}
	if *action != "put" && *action != "delete" {
		return errors.New("action must be get, put, or delete")
	}
	if *expected != current {
		return fmt.Errorf("stale version: expected %d, current %d", *expected, current)
	}
	next := Memory{Scope: scope, Key: *key, Version: current + 1}
	if *action == "put" {
		if *value == "" || *source == "" {
			return errors.New("put requires value and source")
		}
		next.Value, next.Source = *value, *source
		if *expires != "" {
			expiry, err := time.Parse(time.RFC3339, *expires)
			if err != nil {
				return err
			}
			next.ExpiresAt = &expiry
		}
	} else {
		if i < 0 {
			return errors.New("cannot delete a missing memory")
		}
		next.Deleted = true // Retain only scope/key/version, not the deleted value/source.
	}
	if i < 0 {
		rows = append(rows, next)
	} else {
		rows[i] = next
	}
	if err := save(*path, rows); err != nil {
		return err
	}
	return json.NewEncoder(os.Stdout).Encode(next)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
