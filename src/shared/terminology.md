# Liminal Spec Terminology

## Methodology

| Term | Definition |
|------|------------|
| **Liminal Spec** | Spec-driven development methodology. Full rigor or don't use it -- no "lite" versions. |
| **Confidence Chain** | AC -> TC -> Test -> Code. Every line traces back to a requirement. |
| **Context Isolation** | Using fresh agent contexts with artifact handoff instead of long conversations. NOT roleplay. |
| **Artifact** | A document that captures decisions and serves as handoff between agents. |
| **Verification Gradient** | Upstream artifacts get more scrutiny. Feature spec most, implementation least. |

## Phases (as Context Roles)

| Term | Definition |
|------|------------|
| **Agent** | A fresh context session that receives artifacts and produces artifacts. Means context isolation, not roleplay personas. |
| **Product Research** | Optional phase. Vision/idea -> PRD. Often skipped. |
| **Epic** | Creates Epic from requirements. The linchpin -- most scrutiny here. |
| **Tech Design** | Creates Tech Design from Epic. Validates spec as downstream consumer. |
| **Publish Epic** | Phase 4. Transforms detailed epic into two handoff-ready artifacts: a PO-friendly business epic and a developer story file with full AC/TC detail and Jira section markers. |
| **Verification** | Validates artifacts and implementation. Different model for rigor -- thoroughness is the point. |

## Artifacts

| Term | Definition |
|------|------------|
| **PRD** | Product Requirements Document. Multiple features sketched at high level. |
| **Epic** | Complete specification for one feature. ACs, TCs, data contracts, scope. |
| **Tech Design** | Architecture, interfaces, test mapping, work plan. Expands significantly from the epic. |
| **Story** | A discrete, independently executable vertical slice with functional sections (BA/SM) and technical implementation sections (Tech Lead). The sole implementation artifact. |
| **Story Contract** | Four non-negotiable requirements for technically enriched stories: TC-to-test mapping, technical DoD, spec deviation field, targets not steps. |

## Epic Hierarchy

| Term | Definition |
|------|------------|
| **User Profile** | Who the feature is for and their mental model. |
| **Feature Overview** | What the user can do after this feature ships that they can't do today. Follows User Profile. |
| **User Flow** | A sequence of steps through the feature. |
| **AC (Acceptance Criteria)** | A testable requirement. "The system shall..." |
| **TC (Test Condition)** | Verifiable condition for an AC. Formats: Given/When/Then for behavioral checks, numbered sequential steps, or input/output comparison tables. |
| **Data Contract** | TypeScript interface defining data shapes. |
| **Non-Functional Requirement (NFR)** | Cross-cutting constraint (performance, security, observability) that affects how things are built. Becomes Tech Design constraints, not TCs. Optional section. |

## Execution

| Term | Definition |
|------|------------|
| **Story 0** | Foundation (Infrastructure) story. Types, fixtures, error classes, test utilities, and project config. Minimal or no TDD cycle. Always first. |
| **Feature 0** | Stack standup story for new stacks. Auth, connectivity, integrated skeleton with no product functionality. |
| **Skeleton Phase** | Create stubs that throw NotImplementedError. Structure without logic. |
| **TDD Red Phase** | Write tests asserting behavior. Tests ERROR because stubs throw. |
| **TDD Green Phase** | Implement to make tests pass. |
| **Gorilla Testing** | Human-in-loop ad hoc testing after Green. Catches "feels wrong." Legitimizes unstructured work. |
| **Verify Phase** | Formal verification: full test suite, types, lint. |
| **NotImplementedError** | Custom error thrown by stubs. Signals "not yet implemented." |
| **Consumer Gate** | Can an engineer implement from this story without asking clarifying questions? The quality bar for technically enriched stories. |

## Quality Patterns

| Term | Definition |
|------|------------|
| **Downstream Consumer** | The agent who uses an artifact validates it (Tech Lead validates Epic). |
| **Multi-Agent Validation** | Author self-review + downstream consumer review + different model review. |
| **Dual-Validator Pattern** | Launching two validators in parallel with different cognitive profiles (builder + detail-oriented) for complementary coverage. Optional pattern for high-stakes validation. |
| **Running Total** | Cumulative test count across stories. Previous tests must keep passing. |
| **Service Mocks** | In-process tests at public entry points that mock only at external boundaries. The primary test layer -- where TDD lives. |
| **Wide Integration Tests** | Few, slower tests against deployed environment. Verify wiring and configuration. Run locally and post-CD, not on CI. |
| **Progressive Depth** | Documentation style: revisit concepts from multiple angles with increasing depth. Creates redundant connections across functional/technical perspectives so readers can enter at any point. |

## Context Management

| Term | Definition |
|------|------------|
| **Context Rot** | Degradation of agent attention as context grows. |
| **Expansion Ratio** | How much an artifact expands when the next phase elaborates it. |
| **Planner/Coder Split** | Planning context (exploratory) vs execution context (precise). |
| **State File** | JSON/Markdown files tracking project and agent state for recovery. |
| **Checkpoint** | Saving state mid-session before compaction or break. |
| **Artifact as Interface** | The document IS the handoff. No "remember when we discussed..." |

## Anti-Patterns

| Term | Definition |
|------|------------|
| **Testing NotImplementedError** | Writing tests that assert the error instead of behavior. Defeats TDD. |
| **Hook Mocking** | Mocking hooks instead of API boundary. Hides integration bugs. |
| **Negotiation Baggage** | Accumulated assumptions from long conversations that a fresh agent wouldn't know. |
| **Spec Drift** | When implementation diverges from spec without updating the spec. |
| **Agent as Roleplay** | Treating agents as personas instead of context isolation mechanism. |
