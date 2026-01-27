# Feature Specification: Remove Command Files Generation

**Feature Branch**: `001-remove-command-files`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "remove the command files that are being generated for roocode and kilocode meta-prompting setup instead of this rely on custom modes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Custom Modes Only for KiloCode (Priority: P1)

As a developer using KiloCode, when I run the meta-prompting setup wizard and select KiloCode, the system generates custom mode configuration files (`.kilocodemodes` and mode prompt files in `.meeseeks/modes/`) without generating any command files.

**Why this priority**: KiloCode custom modes are the primary workflow mechanism and already exist in the codebase. Command files are redundant when custom modes are available.

**Independent Test**: Can be fully tested by running meta-prompting setup for KiloCode and verifying only mode files are created in `.meeseeks/modes/` directory and `.kilocodemodes` file in project root, with no files in `.kilocode/workflows/`.

**Acceptance Scenarios**:

1. **Given** a project without KiloCode configuration, **When** the user runs meta-prompting setup and selects KiloCode, **Then** the system creates `.kilocodemodes` file and mode prompt files in `.meeseeks/modes/` directory.
2. **Given** a project without KiloCode configuration, **When** the user runs meta-prompting setup and selects KiloCode, **Then** no command files are created in `.kilocode/workflows/` directory.
3. **Given** a project with existing `.kilocodemodes` file, **When** the user runs meta-prompting setup for KiloCode, **Then** the system prompts for overwrite/skip for the existing mode files only.

---

### User Story 2 - Generate Custom Modes for RooCode (Priority: P1)

As a developer using RooCode, when I run the meta-prompting setup wizard and select RooCode, the system generates custom mode configuration files (`.roomodes` and mode prompt files in `.meeseeks/modes/`) instead of command files.

**Why this priority**: Parity with KiloCode - RooCode should also use custom modes as the primary workflow mechanism instead of command files.

**Independent Test**: Can be fully tested by running meta-prompting setup for RooCode and verifying mode files are created, with no files in `.roo/commands/`.

**Acceptance Scenarios**:

1. **Given** a project without RooCode configuration, **When** the user runs meta-prompting setup and selects RooCode, **Then** the system creates `.roomodes` file in project root and mode prompt files in `.meeseeks/modes/` directory.
2. **Given** a project without RooCode configuration, **When** the user runs meta-prompting setup and selects RooCode, **Then** no command files are created in `.roo/commands/` directory.
3. **Given** a project with existing `.roomodes` file, **When** the user runs meta-prompting setup for RooCode, **Then** the system prompts for overwrite/skip for the existing mode files only.

---

### User Story 3 - Prime Context Files Still Generated (Priority: P2)

As a developer, when I run meta-prompting setup, the system still generates prime context stub files (ARCHITECTURE.md, CONVENTION.md, INTEGRATION.md, STACK.md, STRUCTURE.md) in the appropriate context directory.

**Why this priority**: Prime context files are essential prerequisites for the workflow and should continue to be generated regardless of command/mode approach.

**Independent Test**: Can be tested by running setup and verifying prime files exist in the context directory.

**Acceptance Scenarios**:

1. **Given** a project without meta-prompting setup, **When** the user completes the setup wizard, **Then** prime context stub files are created in the appropriate context directory.
2. **Given** a project with existing prime files, **When** the user runs setup, **Then** the system prompts for overwrite/skip for existing prime files.

---

### User Story 4 - Remove Legacy Command File References (Priority: P3)

As a maintainer of this codebase, I want all references to command file generation removed so the codebase is clean and focused on custom modes only.

**Why this priority**: Code cleanup to remove dead code paths after the primary functionality is changed.

**Independent Test**: Can be verified by searching the codebase for command-related generation logic and confirming it's removed.

**Acceptance Scenarios**:

1. **Given** the updated codebase, **When** reviewing the meta-prompting generator code, **Then** there is no logic for generating command files.
2. **Given** the updated codebase, **When** reviewing template files, **Then** command template files in `src/templates/*/commands/` are removed.

---

### Edge Cases

- What happens when migrating from command-based to mode-based setup? Users with existing command files should be able to run the new setup to get mode files, with no conflicts.
- How does system handle projects that already have both `.kilocodemodes` and legacy command files? The system prompts for mode file overwrites only; existing command files and directories (`.roo/commands/`, `.kilocode/workflows/`) are left untouched. User is responsible for manual cleanup of legacy command files.
- What happens if `.meeseeks/modes/` directory already exists with custom user modifications? The system prompts for overwrite/skip per file.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate `.roomodes` configuration file in project root when RooCode is selected.
- **FR-002**: System MUST generate `.kilocodemodes` configuration file in project root when KiloCode is selected.
- **FR-003**: System MUST generate mode prompt files in `.meeseeks/modes/` directory for both RooCode and KiloCode.
- **FR-004**: System MUST NOT generate any command files in `.roo/commands/` or `.kilocode/workflows/` directories.
- **FR-005**: System MUST continue generating prime context stub files (ARCHITECTURE.md, CONVENTION.md, INTEGRATION.md, STACK.md, STRUCTURE.md).
- **FR-006**: System MUST prompt for overwrite confirmation when mode files already exist.
- **FR-007**: Mode configuration files MUST use the same mode definitions (slug, name, description, roleDefinition) currently used for KiloCode.

### Key Entities

- **Mode Configuration File**: JSON file (`.roomodes` or `.kilocodemodes`) containing custom mode definitions in project root.
- **Mode Prompt File**: Markdown file containing detailed instructions for each mode, stored in `.meeseeks/modes/` directory.
- **Prime Context Files**: Markdown stub files containing placeholder sections for codebase documentation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Meta-prompting setup for both RooCode and KiloCode generates mode files exclusively, with zero command files created.
- **SC-002**: All existing tests pass after the changes.
- **SC-003**: Mode-based workflow is fully functional for both RooCode and KiloCode extensions.
- **SC-004**: Setup wizard completes successfully for both extension types.

## Clarifications

### Session 2026-01-27

- Q: How should the system behave if RooCode `.roomodes` format assumption proves incorrect? → A: Assumption is verified - proceed without fallback logic.
- Q: What should happen to existing command directories during setup? → A: Leave untouched - user deletes manually.

## Assumptions

- RooCode supports custom modes in the same format as KiloCode (using `.roomodes` file). *(Verified)*
- Mode prompt files can be shared between RooCode and KiloCode (stored in `.meeseeks/modes/`).
- Users with existing command-based setups can manually migrate by deleting old command directories.
