# Teaching example; see the corresponding intent note for dependencies and validation limits.
# (真实标签, 最高分标签, 最高分)
rows = [
    ("query", "query", 0.95),
    ("submit", "submit", 0.82),
    ("query", "submit", 0.91),  # 高分也会错
    ("unsupported", "query", 0.65),
    ("query", "query", 0.55),
]
for threshold in (0.50, 0.80, 0.95):
    accepted = [r for r in rows if r[2] >= threshold]
    errors = sum(truth != predicted for truth, predicted, _ in accepted)
    error_rate = errors / len(accepted) if accepted else None
    print(threshold, "coverage=", len(accepted) / len(rows),
          "accepted_error=", error_rate)
