# Testing Reference

## Philosophy: Service Mocks

**Service mocks** are in-process tests at public entry points. They test as close to where external calls enter your code as possible, exercise all internal pathways, and mock only at external boundaries. Not unit tests (too fine-grained, mock internal modules). Not end-to-end tests (too slow, require deployed systems). Service mocks hit the sweet spot.

### Core Principle

Test at the entry point. Exercise the full component. Mock only what you must.

```
Your Code
┌─────────────────────────────────────────────────────┐
│  Entry Point (API handler, exported function, etc.) │ ← Test here
│         ↓                                           │
│  Internal logic, state, transformations             │ ← Exercised, not mocked
│         ↓                                           │
│  External boundary (network, DB, filesystem)        │ ← Mock here
└─────────────────────────────────────────────────────┘
```

### Why Service Mocks Work

Traditional unit tests mock at module/class boundaries — testing `UserService` by mocking `UserRepository`. This hides integration bugs between your own components.

Service mocks push the mock boundary outward to where your code ends and external systems begin. You test real integration between your modules while keeping tests fast and deterministic.

**The insight:** Your code is one unit. External systems are the boundary.

### Mock Strategy

| Boundary | Mock? | Why |
|----------|-------|-----|
| **Off-machine** (network, external APIs, services) | Always | Speed, reliability, no external dependencies |
| **On-machine, out-of-process** (local database, Redis) | Usually | Speed; judgment call based on setup complexity |
| **In-process** (your code, your modules) | Never | That's what you're testing |

### The Two Test Layers

Coverage comes from two complementary layers:

**Layer 1: Service mocks (primary)**
- Many tests, fast, in-process
- This is where TDD lives
- Coverage goals met here
- Run on every save, every CI build

**Layer 2: Wide integration tests (secondary)**
- Few tests, slower, require deployed environment
- Verify deployed pieces work together
- Catch configuration and wiring issues
- Run locally before merge, post-CD as verification — NOT on CI

```
┌──────────────────────────────────────────────────┐
│  Service Mocks (many, fast, in-process)         │  ← TDD lives here
│  Coverage goals met here                         │
└──────────────────────────────────────────────────┘
                        +
┌──────────────────────────────────────────────────┐
│  Wide Integration Tests (few, slower, deployed)  │  ← Smoke tests, critical paths
│  Run locally + post-CD, not CI                   │
└──────────────────────────────────────────────────┘
```

### Confidence Distribution

Service mocks provide high confidence for logic and behavior. Wide integration tests provide confidence for deployment and wiring. Together they cover most failure modes.

**What they can't cover:** Visual correctness, UX feel, edge cases you didn't anticipate. That's what gorilla testing is for.

---

## API Testing (Deepest Section)

API testing is the cleanest application of service mocks. The entry point is obvious (the HTTP handler), the boundaries are clear (external services), and the response is easily asserted. This is the pattern to internalize — UI testing adapts it with more friction.

### Pattern: Test the Route Handler

Get as close to the HTTP handler as possible. Use your framework's test injection (Fastify's `inject()`, Express's supertest, etc.) to send requests without network overhead.

```typescript
// Service mock test for POST /api/prompts
describe("POST /api/prompts", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();  // Your app factory
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("authentication", () => {
    // TC-1: requires authentication
    test("returns 401 without auth token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        payload: { prompts: [] },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("validation", () => {
    // TC-2: validates input
    test("returns 400 with invalid slug format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${testToken()}` },
        payload: {
          prompts: [{ slug: "Invalid:Slug", name: "Test", content: "Test" }],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/slug/i);
    });
  });

  describe("success paths", () => {
    // TC-3: creates prompt and returns ID
    test("persists to database and returns created ID", async () => {
      mockDb.insert.mockResolvedValue({ id: "prompt_123" });

      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${testToken({ sub: "user_1" })}` },
        payload: {
          prompts: [{ slug: "my-prompt", name: "My Prompt", content: "Content" }],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().ids).toContain("prompt_123");
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "my-prompt", userId: "user_1" })
      );
    });
  });

  describe("error handling", () => {
    // TC-4: handles database errors gracefully
    test("returns 500 when database fails", async () => {
      mockDb.insert.mockRejectedValue(new Error("Connection lost"));

      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${testToken()}` },
        payload: { prompts: [{ slug: "test", name: "Test", content: "Test" }] },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json().error).toMatch(/internal/i);
    });
  });
});
```

### Setting Up Mocks

Mock external dependencies before importing the code under test. The pattern is framework-agnostic:

```typescript
// Mock external boundaries — database, auth service, config
const mockDb = {
  insert: vi.fn(),
  query: vi.fn(),
  delete: vi.fn(),
};
vi.mock("../lib/database", () => ({ db: mockDb }));

vi.mock("../lib/auth", () => ({
  validateToken: vi.fn(async (token) => {
    if (token === "valid") return { valid: true, userId: "user_1" };
    return { valid: false };
  }),
}));

// Reset between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### What Makes a Good API Service Mock Test

1. **Tests one behavior** — authentication, validation, success path, or error handling
2. **Uses real request/response** — not calling internal functions directly
3. **Mocks only external boundaries** — database, auth service, external APIs
4. **Asserts on observable behavior** — status code, response body, side effects
5. **Traces to a TC** — comment links back to spec

### Wide Integration Tests for APIs

After service mocks verify logic, wide integration tests verify the deployed system works:

```typescript
// Integration test — runs against deployed staging
describe("Prompts API Integration", () => {
  const baseUrl = process.env.TEST_API_URL;
  let authToken: string;

  beforeAll(async () => {
    authToken = await getTestAuth();
  });

  test("create and retrieve prompt round trip", async () => {
    const slug = `test-${Date.now()}`;

    // Create
    const createRes = await fetch(`${baseUrl}/api/prompts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompts: [{ slug, name: "Test", content: "Test" }] }),
    });
    expect(createRes.status).toBe(201);

    // Retrieve
    const getRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).slug).toBe(slug);

    // Cleanup
    await fetch(`${baseUrl}/api/prompts/${slug}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
  });
});
```

**When to run:**
- Locally before merge
- Post-CD as deployment verification
- NOT on CI (too slow, requires deployed environment)

---

## UI Testing (Lighter Section)

UI testing follows the same service mock philosophy but with more friction. The "entry point" is less clear, browser APIs complicate mocking, and visual/UX correctness can't be verified programmatically.

**Same ideals, messier execution.** UI tests can't match API test confidence. Aim for behavioral coverage, then rely on gorilla testing for visual/UX verification.

### The Principle Applied to UI

Mock at the API layer (fetch calls, API client). Let UI framework internals (state, hooks, DOM updates) run for real. Test user interactions and their effects.

```
UI Code
┌─────────────────────────────────────────────────────┐
│  User Interaction (click, type, submit)             │ ← Simulate here
│         ↓                                           │
│  Component logic, state, framework internals        │ ← Runs for real
│         ↓                                           │
│  API calls (fetch, client library)                  │ ← Mock here
└─────────────────────────────────────────────────────┘
```

### HTML/JS (No Framework)

For plain HTML with JavaScript, use jsdom to load templates and test behavior:

```typescript
import { JSDOM } from "jsdom";

describe("Prompt Editor", () => {
  let dom: JSDOM;
  let fetchMock: vi.Mock;

  beforeEach(async () => {
    dom = await JSDOM.fromFile("src/prompt-editor.html", { runScripts: "dangerously" });
    fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ id: "new_id" }) }));
    dom.window.fetch = fetchMock;
  });

  // TC-3: Submit valid form creates prompt
  test("submitting form calls POST /api/prompts", async () => {
    const doc = dom.window.document;
    doc.getElementById("slug").value = "new-prompt";
    doc.getElementById("name").value = "New Prompt";
    doc.getElementById("prompt-form").dispatchEvent(new dom.window.Event("submit"));

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchMock).toHaveBeenCalledWith("/api/prompts", expect.objectContaining({ method: "POST" }));
  });
});
```

### React / Component Frameworks

Same principle — mock API layer, let framework run for real:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock API layer, NOT hooks or components
vi.mock("@/api/promptApi");

describe("PromptList", () => {
  // TC-7: displays prompts when loaded
  test("renders prompt list from API", async () => {
    mockPromptApi.getAll.mockResolvedValue([{ id: "1", name: "Prompt 1" }]);

    render(<PromptList />);

    await waitFor(() => {
      expect(screen.getByText("Prompt 1")).toBeInTheDocument();
    });
  });

  // TC-8: shows error on failure
  test("displays error when API fails", async () => {
    mockPromptApi.getAll.mockRejectedValue(new Error("Failed"));

    render(<PromptList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### E2E for Critical Paths (Playwright)

E2E tests serve as wide integration for UI — verify the full deployed stack works:

```typescript
test("user can create and view prompt", async ({ page }) => {
  await page.goto("/prompts");
  await page.click('[data-testid="new-prompt-button"]');
  await page.fill('[data-testid="slug-input"]', "e2e-test");
  await page.fill('[data-testid="name-input"]', "E2E Test");
  await page.click('[data-testid="submit-button"]');

  await expect(page).toHaveURL(/\/prompts\/e2e-test/);
  await expect(page.getByText("E2E Test")).toBeVisible();
});
```

Run locally and post-CD, not on CI.

### UI Testing Limitations

**Acknowledge the gap:** UI testing cannot match API testing confidence. Visual correctness, UX polish, interaction feel — not verifiable programmatically.

Plan for more gorilla testing. Plan for iterative polish. The GORILLA phase exists partly for this.

---

## CLI Testing

For CLI tools, the entry point is the command handler. The same service mock principle applies: test at the entry point, exercise internal modules through it, mock only at external boundaries (filesystem, network, child processes).

### The Principle Applied to CLI

```
CLI Code
┌─────────────────────────────────────────────────────┐
│  Command handler (yargs, commander, etc.)           │ ← Test here
│         ↓                                           │
│  Internal orchestration (executors, managers)        │ ← Exercised, not mocked
│         ↓                                           │
│  Pure algorithms (parsing, transforming)             │ ← Can test directly (no mocks needed)
│         ↓                                           │
│  Filesystem / network / child processes             │ ← Mock here
└─────────────────────────────────────────────────────┘
```

| Layer | Mock? | Why |
|-------|-------|-----|
| Command handler | Test here | Entry point |
| Internal orchestration (executors, managers) | Don't mock | Exercise through command |
| Pure algorithms (no IO) | Can test directly | No mocking needed, supplemental coverage |
| Filesystem / network / child processes | Mock | External boundary |

### Correct Structure

```
tests/
├── commands/              # Entry point tests (primary coverage)
│   ├── edit-command.test.ts    # Full edit flow, mocks filesystem
│   ├── clone-command.test.ts   # Full clone flow, mocks filesystem
│   └── list-command.test.ts    # Full list flow, mocks filesystem
└── algorithms/            # Pure function tests (supplemental)
    └── tool-call-remover.test.ts  # No mocks, edge case coverage
```

### Anti-Pattern

```
tests/
├── edit-operation-executor.test.ts  # ❌ Internal module with mocked fs
├── backup-manager.test.ts           # ❌ Internal module with mocked fs
├── tool-call-remover.test.ts        # ✓ Pure algorithm, ok
└── edit-command.test.ts             # ✓ Entry point, ok
```

The anti-pattern tests internal modules in isolation with mocked dependencies. This hides integration bugs between your own components — exactly what service mocks avoid. An agent seeing API and UI examples ("test the route handler," "test the component") will pattern-match to "test the executor, test the manager" unless given explicit CLI guidance.

---

## Convex Testing

Convex functions are serverless handlers. Same service mock principle — mock external boundaries, test the function directly:

```typescript
describe("withApiKeyAuth wrapper", () => {
  beforeEach(() => {
    process.env.CONVEX_API_KEY = "test_key";
  });

  test("validates API key and calls handler", async () => {
    const handler = vi.fn(async (ctx, args) => ({ userId: args.userId }));
    const wrapped = withApiKeyAuth(handler);

    const result = await wrapped({}, { apiKey: "test_key", userId: "user_1" });

    expect(result.userId).toBe("user_1");
    expect(handler).toHaveBeenCalled();
  });

  test("rejects invalid API key", async () => {
    const wrapped = withApiKeyAuth(vi.fn());

    await expect(wrapped({}, { apiKey: "wrong", userId: "user_1" })).rejects.toThrow("Invalid");
  });
});
```

---

## TC Traceability

Every test must trace to a Test Condition from the Feature Spec. This is the Confidence Chain in action.

### In Test Code

```typescript
describe("POST /api/prompts", () => {
  // TC-1: requires authentication
  test("returns 401 without auth token", async () => { ... });

  // TC-2: validates slug format
  test("returns 400 with invalid slug", async () => { ... });
});
```

### In Test Plan

| TC ID | Test File | Test Name | Status |
|-------|-----------|-----------|--------|
| TC-1 | createPrompts.test.ts | returns 401 without auth token | Passing |
| TC-2 | createPrompts.test.ts | returns 400 with invalid slug | Passing |

**Rules:**
- TC ID in comment or test name
- Every TC from spec must have at least one test
- Can't write a test? TC is too vague — return to spec

---

## Anti-Patterns

### Asserting on NotImplementedError

```typescript
// ❌ Passes before AND after implementation
it("throws not implemented", () => {
  expect(() => createPrompt(data)).toThrow(NotImplementedError);
});

// ✅ Tests actual behavior
it("creates prompt and returns ID", async () => {
  const result = await createPrompt(data);
  expect(result.id).toBeDefined();
});
```

### Over-Mocking

```typescript
// ❌ Mocking your own code hides bugs
vi.mock("../hooks/useFeature");
vi.mock("../components/FeatureList");

// ✅ Mock only external boundaries
vi.mock("../api/featureApi");
```

### Testing Implementation Details

```typescript
// ❌ Internal state
expect(component.state.isLoading).toBe(true);

// ✅ Observable behavior
expect(screen.getByTestId("loading")).toBeInTheDocument();
```

---

## Test Organization

```
tests/
├── service/           # Service mock tests (primary)
│   ├── api/
│   │   └── prompts.test.ts
│   └── ui/
│       └── prompt-editor.test.ts
├── integration/       # Wide integration tests
│   ├── api.test.ts
│   └── ui.test.ts
└── fixtures/
    └── prompts.ts
```

Track running totals across stories. Previous tests must keep passing — regression = stop and fix.
