// Single-writer teaching example; no LLM, network, or real publication.
// Run this file explicitly: other Go examples in assets also use package main.
package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type Action struct {
	Target string `json:"target"`
	Body   string `json:"body"`
}

type Checkpoint struct {
	Schema    int       `json:"schema"`
	TaskID    string    `json:"task_id"`
	Revision  int       `json:"revision"`
	Status    string    `json:"status"`
	RequestID string    `json:"request_id"`
	Operation string    `json:"operation_id"`
	Action    Action    `json:"action"`
	Deadline  time.Time `json:"deadline"`
	Decision  string    `json:"decision,omitempty"`
	Receipt   string    `json:"receipt,omitempty"`
}

type Effect struct {
	Operation string `json:"operation_id"`
	Action    Action `json:"action"`
	Receipt   string `json:"receipt"`
}

func readJSON(path string, out any) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, out)
}

// A complete old or new file is visible on the tested local filesystem.
// This is NOT a cross-process transaction or a tested power-loss guarantee.
func writeJSON(path string, value any) error {
	b, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".resume-*")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if _, err = f.Write(b); err != nil {
		f.Close()
		return err
	}
	if err = f.Sync(); err != nil {
		f.Close()
		return err
	}
	if err = f.Close(); err != nil {
		return err
	}
	return os.Rename(f.Name(), path)
}

// Simulates a separate service with durable idempotency records.
// The only "publication" is an entry in effects.json. No external API is called.
func publish(path string, c Checkpoint) (string, bool, error) {
	var rows []Effect
	err := readJSON(path, &rows)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return "", false, err
	}
	for _, row := range rows {
		if row.Operation == c.Operation {
			if row.Action != c.Action {
				return "", false, errors.New("idempotency key reused with different arguments")
			}
			return row.Receipt, false, nil
		}
	}
	receipt := "published:" + c.Operation
	rows = append(rows, Effect{c.Operation, c.Action, receipt})
	return receipt, true, writeJSON(path, rows)
}

// Only main calls run. Each invocation loads state afresh from disk.
func run() error {
	dir := flag.String("dir", "", "existing private directory; single writer only")
	command := flag.String("action", "show", "init, show, decide, run")
	decision := flag.String("decision", "", "approve or reject")
	request := flag.String("request", "", "approval request ID printed by init")
	version := flag.Int("version", 0, "revision observed by the reviewer")
	ttl := flag.Duration("ttl", time.Hour, "approval deadline from init")
	crash := flag.Bool("crash-after-effect", false, "exit after simulated publication, before checkpoint")
	flag.Parse()
	if *dir == "" {
		return errors.New("-dir is required")
	}
	path := filepath.Join(*dir, "checkpoint.json")
	var c Checkpoint
	if *command == "init" {
		if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
			return errors.New("checkpoint exists or cannot be inspected; use a new directory")
		}
		if *ttl <= 0 {
			return errors.New("ttl must be positive")
		}
		var id [16]byte
		if _, err := rand.Read(id[:]); err != nil {
			return err
		}
		taskID := hex.EncodeToString(id[:])
		c = Checkpoint{
			Schema: 1, TaskID: taskID, Revision: 1, Status: "waiting",
			RequestID: "approval-1", Operation: taskID + ":publish-1",
			Action:   Action{Target: "guide-v1", Body: "A reviewed draft."},
			Deadline: time.Now().Add(*ttl),
		}
		if err := writeJSON(path, c); err != nil {
			return err
		}
	} else {
		if err := readJSON(path, &c); err != nil {
			return err // Never turn corrupt or missing state into a fresh task.
		}
		if c.Schema != 1 {
			return errors.New("unsupported checkpoint schema")
		}
		save := func(status string) error {
			c.Status = status
			c.Revision++
			return writeJSON(path, c)
		}
		switch *command {
		case "show":
		case "decide":
			// CLI user is trusted in this demo; a service must authenticate first.
			if c.Status != "waiting" || *request != c.RequestID || *version != c.Revision {
				return errors.New("stale, mismatched, or already consumed approval")
			}
			if !time.Now().Before(c.Deadline) {
				if err := save("expired"); err != nil {
					return err
				}
				return errors.New("approval expired")
			}
			if *decision != "approve" && *decision != "reject" {
				return errors.New("decision must be approve or reject")
			}
			c.Decision = *decision
			next := "rejected"
			if *decision == "approve" {
				next = "ready"
			}
			if err := save(next); err != nil {
				return err
			}
		case "run":
			if c.Status == "done" {
				break
			}
			if c.Status != "ready" && c.Status != "executing" {
				return fmt.Errorf("cannot run while %s", c.Status)
			}
			if c.Decision != "approve" {
				return errors.New("missing approval")
			}
			// Deadline limits admission. After admission, recovery reconciles the
			// SAME operation even if the deadline has since passed.
			if c.Status == "ready" {
				if !time.Now().Before(c.Deadline) {
					if err := save("expired"); err != nil {
						return err
					}
					return errors.New("approval expired before execution")
				}
				if err := save("executing"); err != nil {
					return err
				}
			}
			receipt, created, err := publish(filepath.Join(*dir, "effects.json"), c)
			if err != nil {
				return err
			}
			fmt.Printf("effect_created=%t\n", created)
			if *crash {
				os.Exit(23) // Intentional process exit, without saving the receipt.
			}
			c.Receipt = receipt
			if err := save("done"); err != nil {
				return err
			}
		default:
			return errors.New("unknown action")
		}
	}
	return json.NewEncoder(os.Stdout).Encode(c)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
