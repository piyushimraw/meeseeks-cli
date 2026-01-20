# Feature: Release Meeseeks CLI on npm as a Globally Installable Package

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Release Meeseeks CLI as a globally installable npm package so users can install it via `npm install -g <package-name>` and run it from anywhere using the `meeseeks` command. This involves updating package.json with proper metadata, configuring the files to publish, setting up proper versioning, and ensuring the build produces correct executable output.

## User Story

As a developer
I want to install Meeseeks CLI globally via npm
So that I can use the `meeseeks` command from any directory to access AI-powered QA planning, test generation, and documentation management features

## Problem Statement

The current package.json lacks essential metadata required for npm publishing (repository, author, license, keywords, homepage, bugs URL). The package name "meeseeks" and "meeseeks-cli" are already taken on npm. There is no `files` field to control what gets published, no `engines` field to specify Node.js version requirements, and no prepublish scripts to ensure quality.

## Solution Statement

1. Choose an available package name (scoped package under user namespace or alternative unscoped name)
2. Add all required npm metadata fields to package.json
3. Configure the `files` field to whitelist only necessary distribution files
4. Add `engines` field to enforce Node.js 18+ requirement
5. Add prepublish scripts for build validation
6. Ensure the shebang line exists in the entry point
7. Test locally with `npm pack` and `npm link` before publishing

## Feature Metadata

**Feature Type**: Enhancement / Release Configuration
**Estimated Complexity**: Low-Medium
**Primary Systems Affected**: package.json, build configuration
**Dependencies**: npm account, git repository URL

---

## CONTEXT REFERENCES

### Relevant Codebase Files - IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `package.json` (lines 1-40) - Why: Main file to modify with npm publishing metadata
- `src/index.tsx` (line 1) - Why: Must verify shebang `#!/usr/bin/env node` exists
- `dist/index.js` (line 1) - Why: Verify compiled output has shebang line
- `.gitignore` (lines 1-40) - Why: Reference for what NOT to publish
- `README.md` (lines 1-50) - Why: Already documents Node.js 18+ requirement, need to update install instructions
- `tsconfig.json` - Why: Verify build configuration outputs to dist/

### New Files to Create

- `.npmignore` - NOT NEEDED (using `files` field instead - whitelist approach is safer)

### Relevant Documentation - YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [npm package.json documentation](https://docs.npmjs.com/cli/v7/configuring-npm/package-json/)
  - Specific sections: bin, files, engines, repository, keywords
  - Why: Official reference for all package.json fields
- [npm publish command](https://docs.npmjs.com/cli/v11/commands/npm-publish/)
  - Why: Understanding publish workflow and flags
- [npm scoped packages](https://docs.npmjs.com/about-scopes/)
  - Why: If using scoped package name like @username/meeseeks
- [npm bin field guide](https://codingshower.com/understanding-npm-package-json-bin-field/)
  - Why: Ensuring CLI binary is correctly configured
- [Best practices for npm CLI packages](https://webbylab.com/blog/best-practices-for-building-cli-and-publishing-it-to-npm/)
  - Why: Industry best practices for CLI publishing

### Patterns to Follow

**Current Build Configuration:**
```json
{
  "bin": {
    "meeseeks": "dist/index.js"
  },
  "scripts": {
    "build": "tsc"
  }
}
```

**Shebang Pattern (already exists in src/index.tsx:1):**
```typescript
#!/usr/bin/env node
```

---

## IMPLEMENTATION PLAN

### Phase 1: Package Name Decision

The names `meeseeks` and `meeseeks-cli` are already taken on npm:
- `meeseeks` - AWS Lambda microservice library (2016)
- `meeseeks-cli` - IPFS/ENS/Ethereum tool (2019, inactive)

**Options:**
1. **Scoped package** (RECOMMENDED): `@<username>/meeseeks` or `@<username>/meeseeks-cli`
   - Pros: Guaranteed availability, clear ownership
   - Cons: Users type `npm i -g @username/meeseeks`

2. **Alternative unscoped name**: `meeseeks-ai`, `meeseeks-qa`, `meeseeks-copilot`, `mr-meeseeks-cli`
   - Need to verify availability before proceeding

**DECISION NEEDED FROM USER**: Choose package name before implementing.

### Phase 2: Add Required Metadata

Add these fields to package.json:
- `author` - Package author information
- `license` - Already "MIT" (verify in README)
- `repository` - GitHub repository URL
- `homepage` - Project homepage
- `bugs` - Issue tracker URL
- `keywords` - Searchable tags for npm
- `engines` - Node.js version requirement

### Phase 3: Configure Distribution Files

Add `files` field to whitelist only what should be published:
- `dist/` - Compiled JavaScript
- `README.md` - Documentation
- `LICENSE` - License file (need to create if missing)

### Phase 4: Build & Publish Scripts

Add scripts for:
- `prepublishOnly` - Run build, lint, tests before publish
- `prepack` - Ensure dist/ is fresh before packing

### Phase 5: Testing & Validation

1. Run `npm pack` to preview package contents
2. Test with `npm link` for local installation
3. Verify `meeseeks` command works globally

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: ASK - Determine Package Name

- **IMPLEMENT**: Ask user for npm username to determine scoped package name, OR let them choose an alternative unscoped name
- **OPTIONS**:
  - Scoped: `@<npm-username>/meeseeks` (recommended)
  - Unscoped alternatives to check availability: `meeseeks-ai`, `meeseeks-qa`, `meeseeks-copilot`
- **VALIDATE**: `npm search <chosen-name> --json | head -5`

### Task 2: UPDATE package.json - Add Author Field

- **IMPLEMENT**: Add author field with name and email
- **PATTERN**: Follow npm standard format
- **FILE**: `package.json`
- **CODE**:
```json
"author": {
  "name": "<Author Name>",
  "email": "<author@email.com>"
}
```
- **VALIDATE**: `node -e "console.log(require('./package.json').author)"`

### Task 3: UPDATE package.json - Add Repository Field

- **IMPLEMENT**: Add repository field pointing to GitHub repo
- **PATTERN**: npm standard repository format
- **FILE**: `package.json`
- **CODE**:
```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/<username>/meeseeks.git"
}
```
- **VALIDATE**: `node -e "console.log(require('./package.json').repository)"`

### Task 4: UPDATE package.json - Add Bugs and Homepage Fields

- **IMPLEMENT**: Add bugs tracker URL and homepage
- **PATTERN**: npm standard format
- **FILE**: `package.json`
- **CODE**:
```json
"bugs": {
  "url": "https://github.com/<username>/meeseeks/issues"
},
"homepage": "https://github.com/<username>/meeseeks#readme"
```
- **VALIDATE**: `node -e "console.log(require('./package.json').bugs, require('./package.json').homepage)"`

### Task 5: UPDATE package.json - Add Keywords

- **IMPLEMENT**: Add keywords array for npm searchability
- **FILE**: `package.json`
- **CODE**:
```json
"keywords": [
  "cli",
  "copilot",
  "github-copilot",
  "testing",
  "qa",
  "test-generation",
  "ai",
  "terminal",
  "tui",
  "ink",
  "react-cli",
  "knowledge-base",
  "rag"
]
```
- **VALIDATE**: `node -e "console.log(require('./package.json').keywords)"`

### Task 6: UPDATE package.json - Add Engines Field

- **IMPLEMENT**: Add engines field to enforce Node.js 18+ requirement (matches README)
- **FILE**: `package.json`
- **CODE**:
```json
"engines": {
  "node": ">=18.0.0"
}
```
- **VALIDATE**: `node -e "console.log(require('./package.json').engines)"`

### Task 7: UPDATE package.json - Add Files Field (Whitelist)

- **IMPLEMENT**: Add files array to whitelist only distribution files
- **PATTERN**: Whitelist approach is safer than .npmignore blacklist
- **FILE**: `package.json`
- **CODE**:
```json
"files": [
  "dist",
  "README.md"
]
```
- **GOTCHA**: LICENSE file will be auto-included if present at root
- **VALIDATE**: `npm pack --dry-run 2>&1 | head -30`

### Task 8: UPDATE package.json - Update Package Name

- **IMPLEMENT**: Change `name` field to chosen available name
- **FILE**: `package.json`
- **PATTERN**: If scoped, use `@username/package-name` format
- **CODE** (example for scoped):
```json
"name": "@<username>/meeseeks"
```
- **VALIDATE**: `node -e "console.log(require('./package.json').name)"`

### Task 9: UPDATE package.json - Update Description

- **IMPLEMENT**: Improve description to be more descriptive for npm listing
- **FILE**: `package.json`
- **CODE**:
```json
"description": "AI-powered CLI for automated QA planning, test generation, and documentation management using GitHub Copilot"
```
- **VALIDATE**: `node -e "console.log(require('./package.json').description)"`

### Task 10: UPDATE package.json - Add License Field

- **IMPLEMENT**: Add explicit license field (MIT per README)
- **FILE**: `package.json`
- **CODE**:
```json
"license": "MIT"
```
- **VALIDATE**: `node -e "console.log(require('./package.json').license)"`

### Task 11: CREATE LICENSE file

- **IMPLEMENT**: Create MIT LICENSE file at project root
- **FILE**: `LICENSE`
- **CODE**:
```
MIT License

Copyright (c) 2024 <Author Name>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
- **VALIDATE**: `cat LICENSE | head -5`

### Task 12: UPDATE package.json - Add Prepublish Scripts

- **IMPLEMENT**: Add prepublishOnly script to ensure build runs before publish
- **FILE**: `package.json`
- **PATTERN**: Run build before publish
- **CODE**: Add to scripts section:
```json
"prepublishOnly": "npm run build"
```
- **VALIDATE**: `node -e "console.log(require('./package.json').scripts.prepublishOnly)"`

### Task 13: VERIFY Shebang Line in Source

- **IMPLEMENT**: Verify `#!/usr/bin/env node` exists at line 1 of src/index.tsx
- **FILE**: `src/index.tsx`
- **VALIDATE**: `head -1 src/index.tsx | grep -q '#!/usr/bin/env node' && echo "OK: Shebang present" || echo "FAIL: Missing shebang"`

### Task 14: BUILD and Verify Shebang in Output

- **IMPLEMENT**: Run build and verify shebang is in compiled output
- **VALIDATE**:
```bash
npm run build && head -1 dist/index.js | grep -q '#!/usr/bin/env node' && echo "OK: Shebang in dist" || echo "FAIL: Missing shebang in dist"
```

### Task 15: TEST with npm pack

- **IMPLEMENT**: Run npm pack to preview package contents
- **VALIDATE**:
```bash
npm pack --dry-run
```
- **EXPECTED**: Should show only dist/, README.md, LICENSE, and package.json
- **GOTCHA**: If you see src/, node_modules/, or other dev files, the `files` field is misconfigured

### Task 16: TEST with npm link

- **IMPLEMENT**: Test global installation locally using npm link
- **VALIDATE**:
```bash
npm link
meeseeks --help 2>&1 || meeseeks
```
- **CLEANUP**: Run `npm unlink -g <package-name>` after testing

### Task 17: UPDATE README.md - Fix Install Instructions

- **IMPLEMENT**: Update README.md install instructions with correct package name
- **FILE**: `README.md`
- **LINES**: 36-44
- **PATTERN**: Update from `meeseeks-cli` to chosen package name
- **VALIDATE**: `grep -A2 "Global Install" README.md`

### Task 18: PUBLISH to npm (Manual Step)

- **IMPLEMENT**: Publish package to npm registry
- **PREREQ**: Must be logged in with `npm login`
- **COMMANDS**:
  - For scoped public package: `npm publish --access=public`
  - For unscoped package: `npm publish`
- **VALIDATE**: `npm view <package-name>`

---

## TESTING STRATEGY

### Unit Tests

No unit tests required for this configuration change.

### Integration Tests

1. **npm pack test**: Verify package contents are correct
2. **npm link test**: Verify global installation works
3. **Command execution test**: Verify `meeseeks` command launches the CLI

### Edge Cases

- Verify shebang line survives TypeScript compilation
- Verify package works on fresh install (no local node_modules)
- Test on both npm and bun package managers

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Package Configuration Validation

```bash
# Verify package.json is valid JSON
node -e "require('./package.json')"

# Verify required fields exist
node -e "const p=require('./package.json'); ['name','version','description','author','license','repository','bin','files','engines','keywords'].forEach(f => console.log(f + ':', p[f] ? 'OK' : 'MISSING'))"
```

### Level 2: Build Validation

```bash
# Build the project
npm run build

# Verify dist/index.js exists and has shebang
test -f dist/index.js && head -1 dist/index.js
```

### Level 3: Package Contents Validation

```bash
# Preview package contents
npm pack --dry-run

# Verify no sensitive or unnecessary files included
npm pack --dry-run 2>&1 | grep -E "src/|\.env|node_modules" && echo "WARNING: Unwanted files included" || echo "OK: Package contents clean"
```

### Level 4: Local Installation Test

```bash
# Create a tarball
npm pack

# Install globally from tarball
npm install -g ./<package-name>-<version>.tgz

# Test the command
meeseeks

# Cleanup
npm uninstall -g <package-name>
rm <package-name>-<version>.tgz
```

### Level 5: Final Pre-Publish Checklist

```bash
# Verify you're logged into npm
npm whoami

# Dry-run publish to see what would happen
npm publish --dry-run

# For scoped packages, add --access=public
npm publish --dry-run --access=public
```

---

## ACCEPTANCE CRITERIA

- [ ] Package has a valid, available name on npm
- [ ] package.json contains all required metadata (author, repository, bugs, homepage, keywords, license)
- [ ] `files` field whitelists only dist/, README.md (and auto-included LICENSE)
- [ ] `engines` field specifies Node.js >= 18.0.0
- [ ] `prepublishOnly` script runs build before publish
- [ ] LICENSE file exists at project root
- [ ] Shebang line (`#!/usr/bin/env node`) present in dist/index.js
- [ ] `npm pack --dry-run` shows only expected files
- [ ] `npm link` successfully creates global `meeseeks` command
- [ ] `meeseeks` command launches the CLI successfully
- [ ] README.md installation instructions updated with correct package name

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Local installation test passed with npm link
- [ ] Package contents verified with npm pack --dry-run
- [ ] README installation instructions updated
- [ ] Ready for `npm publish` (or `npm publish --access=public` for scoped)

---

## NOTES

### Package Naming Decision

The existing `meeseeks-cli` package on npm is for IPFS/ENS/Ethereum (last updated 2019). Options:

1. **Scoped package** (SAFEST): `@<npm-username>/meeseeks`
   - Guaranteed unique
   - Users install with: `npm i -g @username/meeseeks`
   - Command still runs as `meeseeks`

2. **Try alternative names** (check availability first):
   - `meeseeks-ai`
   - `meeseeks-qa`
   - `meeseeks-copilot`
   - `meeseeks-dev`

### Post-Publish Tasks (Future)

After initial publish, consider:
- Setting up GitHub Actions for automated npm publishing on release tags
- Configuring npm trusted publishing for enhanced security
- Adding changelog automation

### Version Strategy

Start with `1.0.0` (already set). Follow semver:
- PATCH (1.0.x): Bug fixes
- MINOR (1.x.0): New features, backward compatible
- MAJOR (x.0.0): Breaking changes

Use `npm version patch|minor|major` to bump versions.
