import { describe, it, expect } from 'vitest';
import * as embeddedTemplates from './embeddedTemplates.js';

const {
  ROOCODE_TEMPLATES,
  KILOCODE_TEMPLATES,
  KILOCODE_MODE_TEMPLATES,
  getEmbeddedTemplate,
  getEmbeddedModeTemplate,
} = embeddedTemplates;

describe('embeddedTemplates', () => {
  // Command templates have been removed - RooCode and KiloCode now use custom modes instead
  describe('ROOCODE_TEMPLATES (deprecated - empty)', () => {
    it('should be an empty object', () => {
      expect(ROOCODE_TEMPLATES).toBeDefined();
      expect(Object.keys(ROOCODE_TEMPLATES).length).toBe(0);
    });
  });

  describe('KILOCODE_TEMPLATES (deprecated - empty)', () => {
    it('should be an empty object', () => {
      expect(KILOCODE_TEMPLATES).toBeDefined();
      expect(Object.keys(KILOCODE_TEMPLATES).length).toBe(0);
    });
  });

  describe('getEmbeddedTemplate (deprecated)', () => {
    it('throws error for any template name (command templates removed)', () => {
      expect(() =>
        getEmbeddedTemplate('roocode', 'prime')
      ).toThrow('Command templates have been removed');
    });

    it('throws error with template name in message', () => {
      expect(() =>
        getEmbeddedTemplate('kilocode', 'nonexistent')
      ).toThrow("Command template 'nonexistent' not found");
    });
  });

  describe('KILOCODE_MODE_TEMPLATES', () => {
    it('contains kilocodemodes template', () => {
      expect(KILOCODE_MODE_TEMPLATES.kilocodemodes).toBeDefined();
      expect(typeof KILOCODE_MODE_TEMPLATES.kilocodemodes).toBe('string');
    });

    it('kilocodemodes template is valid JSON', () => {
      const content = KILOCODE_MODE_TEMPLATES.kilocodemodes;
      const parsed = JSON.parse(content);

      expect(parsed.customModes).toBeDefined();
      expect(Array.isArray(parsed.customModes)).toBe(true);
    });

    it('contains prime mode prompt template', () => {
      expect(KILOCODE_MODE_TEMPLATES.prime).toBeDefined();
      expect(typeof KILOCODE_MODE_TEMPLATES.prime).toBe('string');
    });
  });

  describe('getEmbeddedModeTemplate (kilocode)', () => {
    it('retrieves kilocodemodes template', () => {
      const template = getEmbeddedModeTemplate('kilocode', 'kilocodemodes');

      expect(template).toBeDefined();
      expect(template).toBe(KILOCODE_MODE_TEMPLATES.kilocodemodes);
    });

    it('retrieves prime mode template', () => {
      const template = getEmbeddedModeTemplate('kilocode', 'prime');

      expect(template).toBeDefined();
      expect(template).toBe(KILOCODE_MODE_TEMPLATES.prime);
    });

    it('throws error for unknown mode template name', () => {
      expect(() =>
        getEmbeddedModeTemplate('kilocode', 'nonexistent' as never)
      ).toThrow('Mode template not found');
    });
  });

  // ===== TDD: Tests for ROOCODE_MODE_TEMPLATES (expected to FAIL initially) =====
  // These tests define the expected behavior for RooCode mode templates.
  // The implementation (ROOCODE_MODE_TEMPLATES and updated getEmbeddedModeTemplate)
  // does not exist yet, so these tests will fail until T002 and T003 are completed.
  //
  // Using it.fails() which passes when the test fails (TDD red phase).
  // When implementation is complete, change it.fails() to it().

  describe('ROOCODE_MODE_TEMPLATES', () => {
    // Access the module dynamically to check for ROOCODE_MODE_TEMPLATES export
    const ROOCODE_MODE_TEMPLATES = (embeddedTemplates as Record<string, unknown>).ROOCODE_MODE_TEMPLATES as
      | { roomodes: string; prime: string }
      | undefined;

    it('should exist as an exported constant', () => {
      // This test expects ROOCODE_MODE_TEMPLATES to be exported from embeddedTemplates.ts
      expect(ROOCODE_MODE_TEMPLATES).toBeDefined();
    });

    it('should contain roomodes template for .roomodes file', () => {
      // The roomodes template should define custom modes for RooCode
      expect(ROOCODE_MODE_TEMPLATES).toBeDefined();
      expect(ROOCODE_MODE_TEMPLATES!.roomodes).toBeDefined();
      expect(typeof ROOCODE_MODE_TEMPLATES!.roomodes).toBe('string');
    });

    it('roomodes template should be valid JSON with customModes array', () => {
      // The roomodes template should be valid JSON matching KiloCode structure
      expect(ROOCODE_MODE_TEMPLATES).toBeDefined();
      const content = ROOCODE_MODE_TEMPLATES!.roomodes;
      const parsed = JSON.parse(content);

      expect(parsed.customModes).toBeDefined();
      expect(Array.isArray(parsed.customModes)).toBe(true);
      expect(parsed.customModes.length).toBeGreaterThan(0);
    });

    it('should contain prime mode prompt template', () => {
      // Mode prompt files for each mode (like prime, orchestrate, etc.)
      expect(ROOCODE_MODE_TEMPLATES).toBeDefined();
      expect(ROOCODE_MODE_TEMPLATES!.prime).toBeDefined();
      expect(typeof ROOCODE_MODE_TEMPLATES!.prime).toBe('string');
    });

    it('roomodes template should have mode entries with correct structure', () => {
      // Each mode should have required fields: slug, name, description, roleDefinition
      expect(ROOCODE_MODE_TEMPLATES).toBeDefined();
      const content = ROOCODE_MODE_TEMPLATES!.roomodes;
      const parsed = JSON.parse(content);
      const firstMode = parsed.customModes[0];

      expect(firstMode.slug).toBeDefined();
      expect(firstMode.name).toBeDefined();
      expect(firstMode.description).toBeDefined();
      expect(firstMode.roleDefinition).toBeDefined();
    });
  });

  describe('getEmbeddedModeTemplate with extension parameter', () => {
    // These tests verify the updated function signature: getEmbeddedModeTemplate(extension, name)
    // T003 updated the function to accept an extension parameter.

    it('should accept extension parameter for roocode', () => {
      const ROOCODE_MODE_TEMPLATES = (embeddedTemplates as Record<string, unknown>).ROOCODE_MODE_TEMPLATES as
        | { roomodes: string }
        | undefined;

      const template = getEmbeddedModeTemplate('roocode', 'roomodes');

      expect(template).toBeDefined();
      expect(typeof template).toBe('string');
      expect(ROOCODE_MODE_TEMPLATES).toBeDefined();
      expect(template).toBe(ROOCODE_MODE_TEMPLATES!.roomodes);
    });

    it('should accept extension parameter for kilocode', () => {
      const template = getEmbeddedModeTemplate('kilocode', 'kilocodemodes');

      expect(template).toBeDefined();
      expect(template).toBe(KILOCODE_MODE_TEMPLATES.kilocodemodes);
    });

    it('should retrieve roocode prime mode template', () => {
      const ROOCODE_MODE_TEMPLATES = (embeddedTemplates as Record<string, unknown>).ROOCODE_MODE_TEMPLATES as
        | { prime: string }
        | undefined;

      const template = getEmbeddedModeTemplate('roocode', 'prime');

      expect(template).toBeDefined();
      expect(ROOCODE_MODE_TEMPLATES).toBeDefined();
      expect(template).toBe(ROOCODE_MODE_TEMPLATES!.prime);
    });

    it('should throw error for unknown roocode mode template', () => {
      expect(() =>
        getEmbeddedModeTemplate('roocode', 'nonexistent' as never)
      ).toThrow('Mode template not found: nonexistent');
    });
  });
});
