# Starter catalog research and release plan

Reviewed on 2026-09-22. This is a qualitative review of public category pages,
not a market-size study, ranking, or exhaustive inventory. Counts varied between
the homepage and cached category pages, so they were not used to rank demand.
No third-party template content was copied into the authored skills.

## Observed structure

- [Notion's category directory](https://www.notion.com/ko/templates/category)
  groups templates around work, school, and life. Work includes marketing,
  operations, HR, product, design, and engineering. The first release focuses on
  the user's three requested audiences, rather than attempting all domains.
- [Personal productivity](https://www.notion.com/ko/templates/category/personal-productivity)
  includes planning, goals, and notes/knowledge. These suggest recurrent jobs
  involving prioritization and turning unstructured material into usable notes.
- [Marketing](https://www.notion.com/ko/templates/category/marketing) includes
  content calendars, campaign briefs, brand guidelines, launch planning, and
  social media. These suggest clear input-to-output workflows for creators.
- [Operations](https://www.notion.com/ko/templates/category/operations) includes
  company goals, planning, SOPs, process guidelines, and competitive analysis.
  These suggest reusable decision and handoff workflows for teams.
- [AI Skills](https://www.notion.com/ko/templates/category/ai-skills) exposes
  writing, summary/organization, and analysis categories. This is a useful
  task-based discovery axis alongside audience, not proof of adoption.

## Product inference and implemented scope

Use two independent filters: audience and job type. Cross-list a skill when it
serves more than one audience. Show the expected result, example inputs, and an
authored example output before asking for authentication or an installation.
The browser composer assembles a request; it does not execute a model.

| Initial audience | Five starting workflows |
| --- | --- |
| Office workers | Meeting notes, document review, email drafting, weekly planning, research summary |
| Solo businesses and creators | Content calendar, repurposing, campaign brief, customer reply, feedback analysis |
| Team managers | Project plan, status report, decision brief, SOP, onboarding |

Each workflow has an original English `skills/<name>/SKILL.md` and Korean
discovery/input/example copy in `web/catalog-data.ts`. SKILL.md is the source
for both the browser's detailed instructions and the individual ZIP download.
The existing Notion-to-GitHub sync remains separate; starter skills are not
automatically inserted into a workspace or its marketplace repository.

## Distribution and adoption

1. Immediate trial: choose a skill, use an example or supply material, copy the
   request into an existing AI conversation. This conveys instructions for that
   conversation; it does not install a native skill or MCP server.
2. Reuse: download an individual skill ZIP. Claude documents ZIP folder upload
   through Customize > Skills. Account settings can restrict this feature.
   [Official upload instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude).
3. Existing workspace content: retain the OAuth library/download flow. Native
   Notion template duplication and an MCP endpoint are future integrations, not
   buttons that currently claim to work.

## Before a public launch

- Run an actual skill task in a target AI for each audience; assess factual
  faithfulness and usefulness, not just file validity. UI example outputs are
  authored illustrations, not recorded model evaluations.
- Observe a new user finding a skill, supplying material, getting a first usable
  answer, and reusing the skill without terminal instructions. Record the
  friction and first-result time before choosing further automation work.
- Verify a real Claude upload and activation; ZIP structure tests alone do not
  prove installation in a customer's account.
- Verify the real Notion OAuth exchange, workspace isolation, and Skills API
  availability. On 2026-09-22 the user-created public connection was observed
  with the correct production callback. Read, update, insert, and comment
  capabilities were enabled. Review the intended scope before onboarding
  users; this web implementation only reads skills and revokes tokens.
- Decide whether the next integration should be a duplicable Notion starter
  database or a remote MCP connector based on those trials. Avoid making
  beginners configure a server or obtain API tokens.

No repository publication or production deployment is part of this iteration.
