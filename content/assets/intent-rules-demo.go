package main

import (
	"fmt"
	"regexp"
	"strings"
)

type Rule struct {
	ID, Intent string
	Pattern    *regexp.Regexp
}

var rules = []Rule{
	{"eligibility", "refund_eligibility", regexp.MustCompile(`^(请问)?订单[A-Za-z0-9]+(能退吗|能不能退|是否可以退款)$`)},
	{"query_only", "refund_eligibility", regexp.MustCompile(`^不要申请退款[，,]?只问订单[A-Za-z0-9]+能退吗$`)},
	{"submit", "refund_submit", regexp.MustCompile(`^(请)?(帮我)?(申请退款|退订单[A-Za-z0-9]+)$`)},
	{"tracking", "track_order", regexp.MustCompile(`^(请)?(帮我)?查订单[A-Za-z0-9]+(物流|到哪了)$`)},
}

func Recognize(text string, rs []Rule) (string, []string) {
	text = strings.TrimRight(strings.TrimSpace(text), "。！？.!?")
	labels := map[string]bool{}
	ids := []string{}
	for _, r := range rs {
		if r.Pattern.MatchString(text) {
			labels[r.Intent] = true
			ids = append(ids, r.ID)
		}
	}
	if len(labels) == 0 {
		return "no_match", ids
	}
	if len(labels) > 1 {
		return "ambiguous", ids
	}
	for label := range labels {
		return label, ids
	}
	panic("unreachable")
}

func main() {
	for _, text := range []string{
		"订单A能退吗？", "请帮我退订单A", "帮我查订单A物流",
		"不要申请退款，只问订单A能退吗", "我不是要申请退款",
		"查订单A物流并申请退款", "帮我订机票",
	} {
		intent, ids := Recognize(text, rules)
		fmt.Printf("%s -> %s %v\n", text, intent, ids)
	}
}
