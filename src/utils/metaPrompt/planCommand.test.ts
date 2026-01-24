import { describe, it, expect } from 'vitest';
import {
  generatePlanFilename,
  buildPlanContext,
  formatContextFile,
  getPlanType,
  getPlanFilenames,
} from './planCommand.js';
import type { PlanContext } from './planCommand.js';

// Tests for pure functions that don't require file system mocking

describe('planCommand', () => {
  describe('generatePlanFilename', () => {
    it('generates filename from JIRA ticket key for impl', () => {
      const result = generatePlanFilename('ENG-123', 'impl');

      expect(result).toBe('eng-123-impl.md');
    });

    it('generates filename from JIRA ticket key for acceptance', () => {
      const result = generatePlanFilename('PROJ-456', 'acceptance');

      expect(result).toBe('proj-456-acceptance.md');
    });

    it('generates filename from JIRA ticket key for context', () => {
      const result = generatePlanFilename('DEV-789', 'context');

      expect(result).toBe('dev-789-context.md');
    });

    it('converts ticket key to lowercase', () => {
      const result = generatePlanFilename('ENG-123', 'impl');

      expect(result).toBe('eng-123-impl.md');
    });

    it('generates slug from description for impl', () => {
      const result = generatePlanFilename('Add user authentication', 'impl');

      expect(result).toBe('add-user-authentication-impl.md');
    });

    it('generates slug from description for acceptance', () => {
      const result = generatePlanFilename('Add user authentication', 'acceptance');

      expect(result).toBe('add-user-authentication-acceptance.md');
    });

    it('handles description with special characters', () => {
      const result = generatePlanFilename("Fix bug #123 - User can't login!", 'impl');

      expect(result).toBe('fix-bug-123-user-can-t-login-impl.md');
    });

    it('handles description with multiple spaces', () => {
      const result = generatePlanFilename('Add    multiple   features', 'impl');

      expect(result).toBe('add-multiple-features-impl.md');
    });

    it('truncates long descriptions to max slug length', () => {
      const longDescription = 'This is a very long feature description that should be truncated to fit within the maximum allowed length';

      const result = generatePlanFilename(longDescription, 'impl');

      // Default max is 30 + "-impl.md" suffix
      const slug = result.replace('-impl.md', '');
      expect(slug.length).toBeLessThanOrEqual(30);
    });

    it('respects custom max slug length', () => {
      const longDescription = 'This is a very long feature description';

      const result = generatePlanFilename(longDescription, 'impl', 10);

      const slug = result.replace('-impl.md', '');
      expect(slug.length).toBeLessThanOrEqual(10);
    });

    it('removes leading and trailing hyphens from slug', () => {
      const result = generatePlanFilename('--add feature--', 'impl');

      expect(result).toBe('add-feature-impl.md');
    });

    it('handles empty description', () => {
      const result = generatePlanFilename('', 'impl');

      expect(result).toBe('-impl.md');
    });

    it('detects ticket key pattern correctly', () => {
      // Valid ticket patterns
      expect(generatePlanFilename('ENG-1', 'impl')).toBe('eng-1-impl.md');
      expect(generatePlanFilename('A-1', 'impl')).toBe('a-1-impl.md');
      expect(generatePlanFilename('PROJECT-12345', 'impl')).toBe('project-12345-impl.md');

      // Invalid ticket patterns (treated as descriptions)
      expect(generatePlanFilename('eng123', 'impl')).toBe('eng123-impl.md');
      expect(generatePlanFilename('ENG', 'impl')).toBe('eng-impl.md');
      expect(generatePlanFilename('123', 'impl')).toBe('123-impl.md');
    });

    it('handles ticket key with whitespace', () => {
      const result = generatePlanFilename('  ENG-123  ', 'impl');

      expect(result).toBe('eng-123-impl.md');
    });
  });

  describe('buildPlanContext', () => {
    it('builds context with JIRA ticket information', () => {
      const context: PlanContext = {
        ticket: {
          key: 'ENG-123',
          summary: 'Add authentication',
          description: 'Implement OAuth2 login',
        },
      };

      const result = buildPlanContext(context);

      expect(result).toContain('# Plan Context');
      expect(result).toContain('## JIRA Ticket');
      expect(result).toContain('**Key**: ENG-123');
      expect(result).toContain('**Summary**: Add authentication');
      expect(result).toContain('### Description');
      expect(result).toContain('Implement OAuth2 login');
    });

    it('includes acceptance criteria when provided', () => {
      const context: PlanContext = {
        ticket: {
          key: 'ENG-123',
          summary: 'Add feature',
          description: 'Description',
          acceptanceCriteria: '- User can login\n- User can logout',
        },
      };

      const result = buildPlanContext(context);

      expect(result).toContain('### Acceptance Criteria');
      expect(result).toContain('- User can login');
      expect(result).toContain('- User can logout');
    });

    it('includes ticket comments when provided', () => {
      const context: PlanContext = {
        ticket: {
          key: 'ENG-123',
          summary: 'Add feature',
          description: 'Description',
          comments: ['First comment', 'Second comment'],
        },
      };

      const result = buildPlanContext(context);

      expect(result).toContain('### Comments');
      expect(result).toContain('**Comment 1**:');
      expect(result).toContain('First comment');
      expect(result).toContain('**Comment 2**:');
      expect(result).toContain('Second comment');
    });

    it('builds context with manual description when no ticket', () => {
      const context: PlanContext = {
        description: 'Add a new feature for user profiles',
      };

      const result = buildPlanContext(context);

      expect(result).toContain('## Description');
      expect(result).toContain('Add a new feature for user profiles');
      expect(result).not.toContain('## JIRA Ticket');
    });

    it('does not include description section when ticket is present', () => {
      const context: PlanContext = {
        ticket: {
          key: 'ENG-123',
          summary: 'Add feature',
          description: 'Ticket description',
        },
        description: 'Manual description',
      };

      const result = buildPlanContext(context);

      // Should only show ticket description, not manual description
      expect(result).toContain('Ticket description');
      // Manual description section should not appear
      expect(result.match(/## Description/g)?.length || 0).toBeLessThanOrEqual(1);
    });

    it('includes Confluence pages when provided', () => {
      const context: PlanContext = {
        description: 'Feature',
        confluencePages: [
          {
            title: 'Design Doc',
            url: 'https://confluence.example.com/page/123',
            content: 'Design details here',
          },
        ],
      };

      const result = buildPlanContext(context);

      expect(result).toContain('## Confluence Documentation');
      expect(result).toContain('### Design Doc');
      expect(result).toContain('*URL*: https://confluence.example.com/page/123');
      expect(result).toContain('Design details here');
    });

    it('includes external documentation when provided', () => {
      const context: PlanContext = {
        description: 'Feature',
        externalDocs: [
          {
            url: 'https://docs.api.com/reference',
            content: 'API reference content',
          },
        ],
      };

      const result = buildPlanContext(context);

      expect(result).toContain('## External Documentation');
      expect(result).toContain('### https://docs.api.com/reference');
      expect(result).toContain('API reference content');
    });

    it('includes codebase context when provided', () => {
      const context: PlanContext = {
        description: 'Feature',
        codebaseContext: {
          architecture: 'Monolith architecture',
          conventions: 'Use camelCase',
          integration: 'REST API integration',
          stack: 'Node.js + React',
          structure: 'src/ contains source code',
        },
      };

      const result = buildPlanContext(context);

      expect(result).toContain('## Codebase Context');
      expect(result).toContain('### Architecture');
      expect(result).toContain('Monolith architecture');
      expect(result).toContain('### Conventions');
      expect(result).toContain('Use camelCase');
      expect(result).toContain('### Integrations');
      expect(result).toContain('REST API integration');
      expect(result).toContain('### Tech Stack');
      expect(result).toContain('Node.js + React');
      expect(result).toContain('### Structure');
      expect(result).toContain('src/ contains source code');
    });

    it('includes related code when provided', () => {
      const context: PlanContext = {
        description: 'Feature',
        relatedCode: [
          { file: 'src/auth/login.ts', relevance: 'Contains existing login logic' },
          { file: 'src/utils/token.ts', relevance: 'Token handling utilities' },
        ],
      };

      const result = buildPlanContext(context);

      expect(result).toContain('## Related Code');
      expect(result).toContain('### src/auth/login.ts');
      expect(result).toContain('*Relevance*: Contains existing login logic');
      expect(result).toContain('### src/utils/token.ts');
      expect(result).toContain('*Relevance*: Token handling utilities');
    });

    it('includes generated timestamp', () => {
      const context: PlanContext = {
        description: 'Feature',
      };

      const result = buildPlanContext(context);

      expect(result).toMatch(/\*Generated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('handles empty context', () => {
      const context: PlanContext = {};

      const result = buildPlanContext(context);

      expect(result).toContain('# Plan Context');
      expect(result).toContain('*Generated:');
    });
  });

  describe('formatContextFile', () => {
    it('calls buildPlanContext', () => {
      const context: PlanContext = {
        description: 'Test feature',
      };

      const result = formatContextFile(context);

      // formatContextFile just delegates to buildPlanContext
      expect(result).toContain('# Plan Context');
      expect(result).toContain('Test feature');
    });
  });

  describe('getPlanType', () => {
    it('returns implementation for -impl.md files', () => {
      expect(getPlanType('eng-123-impl.md')).toBe('implementation');
      expect(getPlanType('feature-auth-impl.md')).toBe('implementation');
    });

    it('returns acceptance for -acceptance.md files', () => {
      expect(getPlanType('eng-123-acceptance.md')).toBe('acceptance');
      expect(getPlanType('feature-auth-acceptance.md')).toBe('acceptance');
    });

    it('returns context for -context.md files', () => {
      expect(getPlanType('eng-123-context.md')).toBe('context');
      expect(getPlanType('feature-auth-context.md')).toBe('context');
    });

    it('returns unknown for other file patterns', () => {
      expect(getPlanType('README.md')).toBe('unknown');
      expect(getPlanType('plan.md')).toBe('unknown');
      expect(getPlanType('eng-123.md')).toBe('unknown');
    });
  });

  describe('getPlanFilenames', () => {
    it('returns all three filename variants for ticket key', () => {
      const result = getPlanFilenames('ENG-123');

      expect(result.impl).toBe('eng-123-impl.md');
      expect(result.acceptance).toBe('eng-123-acceptance.md');
      expect(result.context).toBe('eng-123-context.md');
    });

    it('returns all three filename variants for description', () => {
      const result = getPlanFilenames('Add user login');

      expect(result.impl).toBe('add-user-login-impl.md');
      expect(result.acceptance).toBe('add-user-login-acceptance.md');
      expect(result.context).toBe('add-user-login-context.md');
    });
  });

  // Tests that require file system mocking
  describe('File system dependent functions', () => {
    describe.skip('ensurePlansDir - requires fs mocking', () => {
      it('creates plans directory if not exists', () => {});
      it('returns plans directory path', () => {});
      it('does nothing if directory exists', () => {});
    });

    describe.skip('savePlanFile - requires fs mocking', () => {
      it('saves content to plans directory', () => {});
      it('returns file path', () => {});
      it('creates plans dir if needed', () => {});
    });

    describe.skip('saveContextFile - requires fs mocking', () => {
      it('saves context file alongside plan', () => {});
      it('converts impl filename to context filename', () => {});
    });

    describe.skip('planExists - requires fs mocking', () => {
      it('returns true for existing plan', () => {});
      it('returns false for non-existent plan', () => {});
    });

    describe.skip('readPlan - requires fs mocking', () => {
      it('reads plan file content', () => {});
      it('returns null for non-existent plan', () => {});
    });

    describe.skip('listPlans - requires fs mocking', () => {
      it('returns list of .md files', () => {});
      it('sorts by modification time', () => {});
      it('returns empty array for non-existent directory', () => {});
    });

    describe.skip('getPlanMetadata - requires fs mocking', () => {
      it('extracts ticket from plan content', () => {});
      it('extracts created date', () => {});
      it('extracts status', () => {});
      it('uses defaults for missing fields', () => {});
    });

    describe.skip('findPlansByTicket - requires fs mocking', () => {
      it('finds plans starting with ticket key', () => {});
      it('is case-insensitive', () => {});
    });
  });
});
