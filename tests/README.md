# Tests

## Structure

```text
tests/
└── evals/          # Prompt-based evaluation cases for the skill's behaviour
```

## Evaluation cases

Each YAML file in `evals/` describes one conversation: the user's prompt, the interaction mode, the skill type and the expected behaviour. `evals/eval_metadata.json` lists the cases.

| Case | Covers |
|------|--------|
| `case-1-conversational.yaml` | First-time user guided step by step |
| `case-2-form-mode.yaml` | Experienced user supplying every variable at once |
| `case-3-error-handling.yaml` | Invalid input and recovery |

## Removed Python tests

The pytest unit tests were removed with the Python helper scripts they tested (LS-4748). Those tests called functions with arguments the scripts did not accept, so they never checked real behaviour.
