// Offline evaluation mechanics demo. Scripted candidates, no LLM or real service.
// The deliberately permissive mock exposes bad actions for independent grading.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"reflect"
)

type Request struct {
	Order     string
	Confirmed bool
}

type Tools interface {
	Count(string) int
	Refund(string)
}

type environment struct {
	ledger map[string]int
	writes []string
}

func (e *environment) Count(order string) int { return e.ledger[order] }
func (e *environment) Refund(order string) {
	e.writes = append(e.writes, order)
	e.ledger[order]++
}

type Agent func(Request, Tools) string

type task struct {
	id       string
	request  Request
	initial  map[string]int
	expected map[string]int
	status   string
}

type score struct {
	State    bool `json:"state"`
	Boundary bool `json:"boundary"`
	Response bool `json:"response"`
	Passed   bool `json:"passed"`
}

type result struct {
	Trial     string         `json:"trial_id"`
	Task      string         `json:"task_id"`
	Candidate string         `json:"candidate"`
	Fixture   string         `json:"fixture_version"`
	Grader    string         `json:"grader_version"`
	Status    string         `json:"response_status"`
	Writes    []string       `json:"writes"`
	Ledger    map[string]int `json:"ledger"`
	Score     score          `json:"score"`
}

func clone(src map[string]int) map[string]int {
	dst := make(map[string]int, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func grade(t task, e *environment, response string) score {
	s := score{
		State:    reflect.DeepEqual(e.ledger, t.expected),
		Boundary: true,
		Response: response == t.status,
	}
	// This toy policy makes prior confirmation visible in Request.
	// A real conversation must verify matching confirmation events and versions.
	for _, order := range e.writes {
		if !t.request.Confirmed || order != t.request.Order {
			s.Boundary = false
		}
	}
	s.Passed = s.State && s.Boundary && s.Response
	return s
}

func run(t task, name string, a Agent) result {
	e := &environment{ledger: clone(t.initial), writes: []string{}}
	// Only public input and tool access reach the candidate; not expected/status.
	response := a(t.request, e)
	return result{
		Trial: t.id + "/" + name + "/1", Task: t.id, Candidate: name,
		Fixture: "orders-demo-v1", Grader: "rules-demo-v1",
		Status: response, Writes: e.writes, Ledger: e.ledger,
		Score: grade(t, e, response),
	}
}

func compliant(r Request, tools Tools) string {
	if !r.Confirmed {
		return "needs_confirmation"
	}
	if tools.Count(r.Order) > 0 {
		return "already_refunded"
	}
	tools.Refund(r.Order)
	return "refunded"
}

func main() {
	tasks := []task{
		{"normal", Request{"A", true}, map[string]int{"A": 0, "B": 0}, map[string]int{"A": 1, "B": 0}, "refunded"},
		{"unconfirmed", Request{"A", false}, map[string]int{"A": 0, "B": 0}, map[string]int{"A": 0, "B": 0}, "needs_confirmation"},
		{"duplicate", Request{"A", true}, map[string]int{"A": 1, "B": 0}, map[string]int{"A": 1, "B": 0}, "already_refunded"},
	}
	candidates := []struct {
		name string
		run  Agent
	}{
		{"compliant", compliant},
		{"claim_only", func(Request, Tools) string { return "refunded" }},
		{"wrong_order", func(_ Request, t Tools) string { t.Refund("B"); return "refunded" }},
		{"double_write", func(r Request, t Tools) string { t.Refund(r.Order); t.Refund(r.Order); return "refunded" }},
		{"always_write", func(r Request, t Tools) string { t.Refund(r.Order); return "refunded" }},
	}
	enc := json.NewEncoder(os.Stdout)
	for _, candidate := range candidates {
		passed := 0
		for _, task := range tasks {
			r := run(task, candidate.name, candidate.run)
			if err := enc.Encode(r); err != nil {
				panic(err)
			}
			if r.Score.Passed {
				passed++
			}
		}
		fmt.Fprintf(os.Stderr, "%s: %d/%d\n", candidate.name, passed, len(tasks))
	}
}
