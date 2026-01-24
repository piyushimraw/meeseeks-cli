# Plan: Enhanced Verification Modes with Test Generation

## Objective

Update `meeseeks:generate-verification` to write actual test files (unit, integration) and AI-assisted testing prompts, and update `meeseeks:verify` to execute all automated tests, AI-assisted prompts, and conduct interactive UAT interviews.

---

## Current State

### `meeseeks:generate-verification` (623 lines)
**Location**: `src/templates/kilocode/modes/meeseeks-generate-verification.prompt.md`

**Currently does**:
- Parses plan.md for implementation steps
- Detects test frameworks (Jest, Vitest, pytest, Playwright)
- Generates test SPECIFICATIONS (skeleton code) in verification.md
- Creates UAT scenarios in verification.md

**Gap**: Only writes specifications to verification.md - doesn't create actual test files

### `meeseeks:verify` (379 lines)
**Location**: `src/templates/kilocode/modes/meeseeks-verify.prompt.md`

**Currently does**:
- Runs automated tests with `npm test` / `pytest`
- Interactive fix mode for failures
- Manual verification checklist (p=pass, f=fail, s=skip)
- Code review checklist
- Generates verification report
- Archives task on success

**Gap**: No AI-assisted prompt execution, basic UAT checklist (not interview-style)

---

## Implementation Plan

### Part 1: Update `meeseeks-generate-verification.prompt.md`

Add three new phases after the current test specification generation:

#### Phase A: Generate Actual Test Files

Insert new section after line ~230 (after browser test specs):

```markdown
## Phase: Write Test Files

For each test specification above, CREATE the actual test files:

### 1. Detect Test Location Convention

```bash
# Check for existing patterns
ls tests/**/*.test.ts 2>/dev/null || ls src/**/*.test.ts 2>/dev/null
```

- If `tests/` folder exists with test files → use separate tests/ folder
- If `*.test.ts` files exist alongside source → use co-located pattern
- Default: co-located (src/foo.ts → src/foo.test.ts)

### 2. Write Unit Test Files

For each unit test specification:
1. Create test file at detected location
2. Use AI to generate comprehensive tests based on:
   - The specification skeleton
   - The source file to be tested (from plan.md)
   - Project testing rules from .meeseeks/rules/test.md (if exists)
3. Include: imports, describe blocks, individual test cases
4. Log: `[Test-Gen] Created {path} ({N} tests)`

### 3. Write Integration Test Files

For each integration test specification:
1. Create test file at `tests/integration/{feature}.test.ts`
2. Include: setup/teardown, API mocking, endpoint tests
3. Log: `[Test-Gen] Created {path} ({N} tests)`
```

#### Phase B: Generate AI-Assisted Testing Prompts

Insert new section after test file generation:

```markdown
## Phase: Generate AI-Assisted Testing Prompts

Create prompts for verification that requires human judgment:

### 1. Create Prompt Directory

```bash
mkdir -p .meeseeks/tasks/{task-key}/ai-tests
```

### 2. Generate Prompt Files

For each acceptance criterion requiring:
- Visual verification (UI appearance)
- Complex user flows
- Subjective evaluation (UX quality)

Create `.meeseeks/tasks/{task-key}/ai-tests/{test-name}.md`:

```markdown
# AI-Assisted Test: {test-name}

## Context
- **Related AC**: {acceptance-criteria-id}
- **Feature**: {description}
- **Type**: visual-verification | behavior-analysis | data-validation

## Pre-conditions
- {setup requirements}

## Test Steps
{Natural language steps to verify}

## Expected Outcomes
- [ ] {outcome 1}
- [ ] {outcome 2}

## Evidence Required
- screenshot: {name}.png (if applicable)
```

### 3. Update verification.md

Add section referencing AI-assisted prompts:

```markdown
## AI-Assisted Tests

| Prompt File | Type | AC Coverage |
|-------------|------|-------------|
| ai-tests/{name}.md | {type} | AC-{N} |
```
```

#### Phase C: Update State Tracking

Add to state.json update section:

```json
{
  "test_files_generated": ["src/foo.test.ts", "tests/integration/api.test.ts"],
  "ai_test_prompts": ["ai-tests/visual-login.md"]
}
```

---

### Part 2: Update `meeseeks-verify.prompt.md`

#### Update A: Enhanced Test Execution (Step 1)

Replace current "Run Automated Tests" section with:

```markdown
### Step 1: Run All Automated Tests

1. **Parse verification.md** for generated test files
2. **Run unit tests**:
   ```bash
   npm test -- --reporter=json 2>&1 | tee unit-results.json
   ```
3. **Run integration tests** (if present):
   ```bash
   npm run test:integration 2>&1 | tee integration-results.json
   ```
4. **Display results**:
   ```
   Automated Test Results
   ======================
   Unit Tests: {passed}/{total} ({percentage}%)
   Integration Tests: {passed}/{total} ({percentage}%)

   {If failures, list them with details}
   ```
```

#### Update B: New AI-Assisted Test Execution (New Step 2)

Insert after automated tests:

```markdown
### Step 2: Execute AI-Assisted Tests

1. **Discover prompt files**:
   ```bash
   ls .meeseeks/tasks/{task-key}/ai-tests/*.md
   ```

2. **Present overview**:
   ```
   Found {N} AI-assisted test prompts:
   1. {name}.md ({type})
   2. {name}.md ({type})

   Start AI-assisted verification? (yes/skip all/select)
   ```

3. **For each prompt**:
   - Display the test context and steps
   - Guide user through verification interactively
   - For each expected outcome, prompt: `Verified? (y/n/partial)`
   - If partial/no: `Describe what you observed:`
   - Capture evidence if applicable

4. **Record results** for verification report
```

#### Update C: Interactive UAT Interview (New Step 3)

Replace current "Manual Verification Checklist" with:

```markdown
### Step 3: Interactive UAT Interview

Conduct conversational verification for each UAT scenario:

```
+----------------------------------------------------------------------------+
| User Acceptance Testing: {task-key}                                        |
+----------------------------------------------------------------------------+

I'll guide you through {N} acceptance scenarios.

Ready to begin? (yes/defer/skip)
```

**For each UAT scenario**:

1. **Present the scenario**:
   ```
   UAT-{N}: {Scenario Name} ({Priority})
   =====================================
   Objective: {description}

   Prerequisites:
   - [ ] {prerequisite 1}

   Have prerequisites ready? (yes/no)
   ```

2. **Walk through each step**:
   ```
   Step {N}: {Action description}
   --> When complete, press [Enter]

   Expected: {expected outcome}
   Did you observe this? (yes/no/partial)
   ```

3. **If discrepancy**:
   ```
   Please describe what you observed:
   > {user input}

   [Recording observation]
   ```

4. **Summarize scenario result**:
   ```
   UAT-{N} Summary:
   - Steps: {completed}/{total}
   - Verifications: {passed}/{total}
   - Status: PASSED / FAILED / PARTIAL

   Continue to UAT-{N+1}? (yes/no)
   ```
```

#### Update D: Enhanced Verification Report

Update report generation to include all three verification types:

```markdown
## Verification Report Structure

| Phase | Result | Details |
|-------|--------|---------|
| Automated Tests | {status} | {passed}/{total} |
| AI-Assisted Tests | {status} | {checks passed}/{total checks} |
| UAT Interview | {status} | {scenarios passed}/{total} |

### AI-Assisted Test Results
| Prompt | Result | Issues |
|--------|--------|--------|
| {name}.md | {PASSED/PARTIAL/FAILED} | {issues if any} |

### UAT Interview Results
| Scenario | Result | Notes |
|----------|--------|-------|
| UAT-1 | {status} | {observations} |
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/templates/kilocode/modes/meeseeks-generate-verification.prompt.md` | Add test file generation, AI prompt generation phases |
| `src/templates/kilocode/modes/meeseeks-verify.prompt.md` | Add AI test execution, interactive UAT interview |

---

## Verification

After implementation:

1. **Test generate-verification**:
   - Create a sample task with plan.md
   - Run generate-verification mode
   - Verify: test files created (not just specs in verification.md)
   - Verify: ai-tests/*.md prompt files created
   - Verify: verification.md references actual files

2. **Test verify mode**:
   - Run verify mode on a task with generated tests
   - Verify: automated tests run and results displayed
   - Verify: AI-assisted prompts are presented interactively
   - Verify: UAT interview walks through scenarios step-by-step
   - Verify: final report includes all three verification types
