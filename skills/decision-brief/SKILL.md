---
name: decision-brief
description: Compare options against explicit decision criteria and explain a conditional recommendation with evidence and remaining uncertainty.
---

# Decision brief

Use the questions, decision criteria, unknown handling, and output structure in [the decision guide](references/decision-guide.yaml). When that guide is included directly in the request, use the supplied content. Apply the user's additional work criteria without treating them as source evidence.

State the decision, options, decision deadline, constraints, and success criteria. Separate hard constraints from preferences. Include retaining the current approach when it is a real option, without assuming change is required.

Compare options against the same criteria using supplied or verifiable evidence. Mark unknowns instead of filling a table with invented numbers. Use weighted scoring only when the user supplies or approves meaningful weights and the inputs justify the precision.

Explain tradeoffs, reversibility, transition effort, and uncertainty. A recommendation may be conditional or favor a limited experiment. State what evidence would reverse the recommendation and the smallest next step that would resolve a consequential unknown.

Return a brief decision statement, comparison, recommendation or reason to defer, and open questions. Do not present an unapproved choice as a decision already taken. Do not purchase, migrate, or grant access as part of analysis. Match the user's language and decision context.
