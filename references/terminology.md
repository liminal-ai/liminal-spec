# SDD Terminology

## Methodology

| Term | Definition |
|------|------------|
| **SDD** | Spec-Driven Development. The methodology. Full rigor or don't use it — no "lite" versions. |
| **Confidence Chain** | AC → TC → Test → Code. Every line traces back to a requirement. |
| **Context Isolation** | Using fresh agent contexts with artifact handoff instead of long conversations. NOT roleplay. |
| **Artifact** | A document that captures decisions and serves as handoff between agents. |
| **Verification Gradient** | Upstream artifacts get more scrutiny. Feature spec most, implementation least. |

## Phases (as Context Roles)

| Term | Definition |
|------|------------|
| **Agent** | A fresh context session that receives artifacts and produces artifacts. Means context isolation, not roleplay personas. |
| **Product Research** | Optional phase. Product Brief → PRD. Often skipped. |
| **Feature Specification** | Creates Feature Spec from requirements. The linchpin — most scrutiny here. |
| **Tech Design** | Creates Tech Design from Feature Spec. Validates spec as downstream consumer. |
| **Story Sharding / Orchestration** | Creates Stories and Prompts from Tech Design. Orchestrates but doesn't implement. |
| **Implementation** | Executes implementation from prompt packs. Zero prior context. |
| **Verification** | Validates artifacts and implementation. Different model for rigor (pedantic is the point). |

## Artifacts

| Term | Definition |
|------|------------|
| **PRD** | Product Requirements Document. Multiple features sketched at high level. |
| **Feature Spec** | Complete specification for one feature (~300 lines). ACs, TCs, data contracts, scope. |
| **Tech Design** | Architecture, interfaces, test mapping, work plan (~2000 lines for 300-line spec). |
| **Story** | A discrete unit of work with its own prompt pack. Maps to tech design chunk. |
| **Prompt Pack** | Self-contained instructions for executing one phase of a story. All context inlined. |

## Feature Spec Hierarchy

| Term | Definition |
|------|------------|
| **User Profile** | Who the feature is for and their mental model. |
| **User Flow** | A sequence of steps through the feature. |
| **AC (Acceptance Criteria)** | A testable requirement. "The system shall..." |
| **TC (Test Condition)** | Given/When/Then statement for verifying an AC. |
| **Data Contract** | TypeScript interface defining data shapes. |

## Execution

| Term | Definition |
|------|------------|
| **Skeleton Phase** | Create stubs that throw NotImplementedError. Structure without logic. |
| **TDD Red Phase** | Write tests asserting behavior. Tests ERROR because stubs throw. |
| **TDD Green Phase** | Implement to make tests pass. |
| **Gorilla Testing** | Human-in-loop ad hoc testing after Green. Catches "feels wrong." Legitimizes unstructured work. |
| **Verify Phase** | Formal verification: full test suite, types, lint. |
| **NotImplementedError** | Custom error thrown by stubs. Signals "not yet implemented." |

## Quality Patterns

| Term | Definition |
|------|------------|
| **Downstream Consumer** | The agent who uses an artifact validates it (Tech Lead validates Feature Spec). |
| **Multi-Agent Validation** | Author self-review + downstream consumer review + different model review. |
| **Running Total** | Cumulative test count across stories. Previous tests must keep passing. |
| **Decadent Spiral** | Tech design writing style: verbose, weaving functional↔technical, redundant connections. |

## Context Management

| Term | Definition |
|------|------------|
| **Context Rot** | Degradation of agent attention as context grows. |
| **Expansion Ratio** | How much an artifact expands (300-line spec → 2k-line design). |
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
| **SDD Lite** | Attempting partial SDD. Either do full methodology or use a different approach. |
| **Agent as Roleplay** | Treating agents as personas instead of context isolation mechanism. |
