---
name: weekly-plan
description: Turn a task list and available work hours into a feasible weekly plan that respects deadlines and dependencies.
---

# Weekly plan

Use the questions, decision criteria, unknown handling, and output structure in [the decision guide](references/decision-guide.yaml). When that guide is included directly in the request, use the supplied content. Apply the user's additional work criteria without treating them as source evidence.

Extract each task's deadline, estimated effort, dependencies, and impact. Distinguish firm deadlines from preferences. If effort is unknown, label an estimate and show how it affects feasibility rather than treating it as measured time.

Calculate total available time and proposed workload. Reserve reasonable room for interruptions only within that capacity, stating the assumption. Prioritize hard deadlines, prerequisite work, and the user's stated goals. Break oversized tasks into observable next steps.

Build a schedule whose allocations fit the supplied availability. Preserve meetings, leave, and unavailable days. If the work cannot fit, explicitly identify tasks to defer, reduce, or renegotiate; never silently assign overtime. Keep optional work distinct from committed work.

Return an actionable weekly outline, priorities, deferred work, and the most important missing estimates. Check that the sum of scheduled work does not exceed capacity. Use relative weekday labels when dates are not supplied. Do not create calendar entries or change a task system unless separately requested. Respond in the user's language.
