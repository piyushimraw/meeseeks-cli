# Tasks: Remove Command Files Generation

**Input**: Design documents from `/specs/001-remove-command-files/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Included as per Constitution (Test-First TDD required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Mode config files: `.roomodes`, `.kilocodemodes` in project root
- Mode prompts: `.meeseeks/modes/` directory
- Templates: `src/templates/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project setup needed - modifying existing codebase

*No setup tasks required - existing project structure and dependencies are in place.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add RooCode mode templates that will be needed by all user stories

**⚠️ CRITICAL**: User stories depend on RooCode mode templates existing

- [ ] T001 Add RooCode mode template test to src/utils/metaPrompt/embeddedTemplates.test.ts
- [ ] T002 Create ROOCODE_MODE_TEMPLATES constant in src/utils/metaPrompt/embeddedTemplates.ts
- [ ] T003 Update getEmbeddedModeTemplate() to accept extension parameter in src/utils/metaPrompt/embeddedTemplates.ts

**Checkpoint**: Foundation ready - RooCode mode templates available for use

---

## Phase 3: User Story 1 - Generate Custom Modes Only for KiloCode (Priority: P1) 🎯 MVP

**Goal**: KiloCode generates only mode files, no command files

**Independent Test**: Run meta-prompting setup for KiloCode and verify only `.kilocodemodes` and `.meeseeks/modes/` files are created, with no files in `.kilocode/workflows/` (except context/)

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T004 [US1] Add test: KiloCode setup creates .kilocodemodes in tests/screens/MetaPromptInit.test.tsx
- [ ] T005 [US1] Add test: KiloCode setup creates mode prompts in .meeseeks/modes/ in tests/screens/MetaPromptInit.test.tsx
- [ ] T006 [US1] Add test: KiloCode setup does NOT create command files in tests/screens/MetaPromptInit.test.tsx

### Implementation for User Story 1

- [ ] T007 [US1] Remove command file checking logic (lines ~137-153) from src/screens/MetaPromptInit.tsx
- [ ] T008 [US1] Remove command file generation loop (lines ~229-264) from src/screens/MetaPromptInit.tsx
- [ ] T009 [US1] Update existing KiloCode mode generation to work without command references in src/screens/MetaPromptInit.tsx
- [ ] T010 [US1] Verify KiloCode mode files are still correctly generated in src/screens/MetaPromptInit.tsx

**Checkpoint**: KiloCode generates mode files only, no command files

---

## Phase 4: User Story 2 - Generate Custom Modes for RooCode (Priority: P1)

**Goal**: RooCode generates `.roomodes` and mode prompt files instead of command files

**Independent Test**: Run meta-prompting setup for RooCode and verify `.roomodes` and `.meeseeks/modes/` files are created, with no files in `.roo/commands/`

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T011 [P] [US2] Add test: RooCode setup creates .roomodes in project root in tests/screens/MetaPromptInit.test.tsx
- [ ] T012 [P] [US2] Add test: RooCode setup creates mode prompts in .meeseeks/modes/ in tests/screens/MetaPromptInit.test.tsx
- [ ] T013 [P] [US2] Add test: RooCode setup does NOT create command files in tests/screens/MetaPromptInit.test.tsx

### Implementation for User Story 2

- [ ] T014 [US2] Add .roomodes file existence checking in src/screens/MetaPromptInit.tsx
- [ ] T015 [US2] Add .roomodes generation using getEmbeddedModeTemplate('roocode', 'roomodes') in src/screens/MetaPromptInit.tsx
- [ ] T016 [US2] Add RooCode mode prompt file generation to .meeseeks/modes/ in src/screens/MetaPromptInit.tsx
- [ ] T017 [US2] Add overwrite prompts for existing RooCode mode files in src/screens/MetaPromptInit.tsx

**Checkpoint**: RooCode generates mode files identical to KiloCode pattern

---

## Phase 5: User Story 3 - Prime Context Files Still Generated (Priority: P2)

**Goal**: Verify prime context files continue to be generated unchanged

**Independent Test**: Run setup and verify prime files exist in context directory

### Tests for User Story 3 ⚠️

- [ ] T018 [P] [US3] Add test: RooCode setup creates prime files in .roo/ in tests/screens/MetaPromptInit.test.tsx
- [ ] T019 [P] [US3] Add test: KiloCode setup creates prime files in .kilocode/workflows/context/ in tests/screens/MetaPromptInit.test.tsx

### Implementation for User Story 3

- [ ] T020 [US3] Verify prime file generation logic remains unchanged in src/screens/MetaPromptInit.tsx
- [ ] T021 [US3] Verify prime metadata generation remains unchanged in src/screens/MetaPromptInit.tsx

**Checkpoint**: Prime files generate correctly for both extensions

---

## Phase 6: User Story 4 - Remove Legacy Command File References (Priority: P3)

**Goal**: Clean codebase with no command-related dead code

**Independent Test**: Search codebase for command-related generation logic and confirm it's removed

### Tests for User Story 4 ⚠️

- [ ] T022 [P] [US4] Update generator.test.ts to remove getCommandsSubdir() tests in src/utils/metaPrompt/generator.test.ts
- [ ] T023 [P] [US4] Update generator.test.ts to remove getOutputExtension() tests in src/utils/metaPrompt/generator.test.ts
- [ ] T024 [P] [US4] Update generator.test.ts to remove "Command Prompts" section tests from generateIndexMd() in src/utils/metaPrompt/generator.test.ts

### Implementation for User Story 4

- [ ] T025 [P] [US4] Remove getCommandsSubdir() function from src/utils/metaPrompt/generator.ts
- [ ] T026 [P] [US4] Remove getOutputExtension() function from src/utils/metaPrompt/generator.ts
- [ ] T027 [US4] Update generateIndexMd() to remove "Command Prompts" section in src/utils/metaPrompt/generator.ts
- [ ] T028 [US4] Remove command templates from ROOCODE_TEMPLATES in src/utils/metaPrompt/embeddedTemplates.ts
- [ ] T029 [US4] Remove command templates from KILOCODE_TEMPLATES in src/utils/metaPrompt/embeddedTemplates.ts
- [ ] T030 [US4] Update exports in src/utils/metaPrompt/index.ts
- [ ] T031 [US4] Delete src/templates/roocode/commands/ directory
- [ ] T032 [US4] Delete src/templates/roocode/commands.json file
- [ ] T033 [US4] Delete src/templates/kilocode/commands/ directory
- [ ] T034 [US4] Delete src/templates/kilocode/commands.json file
- [ ] T035 [US4] Review and clean src/utils/metaPrompt/types.ts for command-related types
- [ ] T036 [US4] Review src/hooks/useMetaPromptWizardState.ts for command-related state cleanup

**Checkpoint**: Codebase clean of all command-related code

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T037 [P] Run npm test to verify all tests pass
- [ ] T038 [P] Run npm run typecheck to verify no type errors
- [ ] T039 [P] Run npm run lint to verify no linting issues
- [ ] T040 Verify 80% coverage threshold maintained with npm run test:coverage
- [ ] T041 Run quickstart.md verification checklist manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No setup needed
- **Foundational (Phase 2)**: No dependencies - must complete before user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion (but independent of US1/US2)
- **User Story 4 (Phase 6)**: Depends on User Stories 1-2 completion (code removal after new behavior works)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Parallel with US1, shares mode template from Phase 2
- **User Story 3 (P2)**: Can start after Foundational - Independent verification task
- **User Story 4 (P3)**: Must wait for US1 and US2 to complete (removes code they modify)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD per Constitution)
- Implementation tasks follow test tasks
- Story complete before moving to next priority

### Parallel Opportunities

- All Foundational tasks (T001-T003) must be sequential (same file)
- US1 and US2 can run in parallel after Foundational completes
- US3 can run in parallel with US1/US2
- US4 must wait for US1/US2 (removes code they're modifying)
- Within US4, deletion tasks (T031-T034) can run in parallel
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Stories 1 & 2

```text
# After Phase 2 (Foundational) completes, launch in parallel:

# Team Member A: User Story 1 (KiloCode)
Task: T004 - Test: KiloCode creates .kilocodemodes
Task: T005 - Test: KiloCode creates mode prompts
Task: T006 - Test: KiloCode does NOT create command files
Task: T007-T010 - Implementation

# Team Member B: User Story 2 (RooCode)
Task: T011 - Test: RooCode creates .roomodes
Task: T012 - Test: RooCode creates mode prompts
Task: T013 - Test: RooCode does NOT create command files
Task: T014-T017 - Implementation
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (RooCode mode templates)
2. Complete Phase 3: User Story 1 (KiloCode mode-only)
3. **STOP and VALIDATE**: Run KiloCode setup, verify only mode files created
4. Can deploy if only KiloCode support needed immediately

### Incremental Delivery

1. Complete Foundational → Templates ready
2. Add User Story 1 → KiloCode works with modes only → Test
3. Add User Story 2 → RooCode works with modes → Test
4. Add User Story 3 → Verify prime files → Test
5. Add User Story 4 → Clean up dead code → Test
6. Each story adds value without breaking previous stories

### Recommended Order (Single Developer)

1. Phase 2: T001 → T002 → T003
2. Phase 3: T004-T006 (tests) → T007-T010 (implementation)
3. Phase 4: T011-T013 (tests) → T014-T017 (implementation)
4. Phase 5: T018-T019 (tests) → T020-T021 (verification)
5. Phase 6: T022-T024 (tests) → T025-T036 (cleanup)
6. Phase 7: T037-T041 (validation)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
