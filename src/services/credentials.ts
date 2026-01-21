import { Entry } from '@napi-rs/keyring';
import { loadConfig, saveConfig } from '../utils/settings.js';

const SERVICE_PREFIX = 'meeseeks';

export interface Credential {
  service: string;   // e.g., 'jira', 'squadcast'
  account: string;   // e.g., 'api-token', 'url'
  secret: string;
}

export class CredentialService {
  /**
   * Store a credential in the config file
   */
  async store(cred: Credential): Promise<void> {
    const config = loadConfig();

    // Ensure services object exists
    if (!config.services) {
      config.services = {};
    }

    // Ensure service entry exists
    if (!config.services[cred.service]) {
      config.services[cred.service] = {};
    }

    // Ensure credentials object exists
    if (!config.services[cred.service].credentials) {
      config.services[cred.service].credentials = {};
    }

    // Store credential
    config.services[cred.service].credentials![cred.account] = cred.secret;

    saveConfig(config);
  }

  /**
   * Retrieve a credential from config file (with keychain migration)
   * Returns null if not found
   */
  async retrieve(service: string, account: string): Promise<string | null> {
    const config = loadConfig();

    // Try file first
    const fromFile = config.services?.[service]?.credentials?.[account];
    if (fromFile) {
      return fromFile;
    }

    // If not found, try keychain (migration)
    try {
      const entry = new Entry(`${SERVICE_PREFIX}-${service}`, account);
      const fromKeychain = entry.getPassword();

      if (fromKeychain) {
        // Migrate to file storage
        await this.store({ service, account, secret: fromKeychain });
        return fromKeychain;
      }

      return null;
    } catch {
      // Entry not found in keychain either
      return null;
    }
  }

  /**
   * Delete a credential from the config file
   * Returns true if deleted, false if not found
   */
  async delete(service: string, account: string): Promise<boolean> {
    const config = loadConfig();

    // Delete from config
    if (config.services?.[service]?.credentials?.[account]) {
      delete config.services[service].credentials![account];
      saveConfig(config);
      return true;
    }

    return false;
  }

  /**
   * Check if a credential exists
   */
  async exists(service: string, account: string): Promise<boolean> {
    const value = await this.retrieve(service, account);
    return value !== null;
  }

  /**
   * Store multiple fields for a service at once
   * Used for services with multiple credential fields (url, token, etc.)
   */
  async storeFields(service: string, fields: Record<string, string>): Promise<void> {
    for (const [account, secret] of Object.entries(fields)) {
      if (secret) {
        await this.store({ service, account, secret });
      }
    }
  }

  /**
   * Retrieve all fields for a service
   * Returns object with field values (null for missing fields)
   */
  async retrieveFields(service: string, fieldKeys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    for (const key of fieldKeys) {
      result[key] = await this.retrieve(service, key);
    }
    return result;
  }

  /**
   * Delete all fields for a service
   */
  async deleteAll(service: string, fieldKeys: string[]): Promise<void> {
    for (const key of fieldKeys) {
      await this.delete(service, key);
    }
  }
}

// Singleton instance for app-wide use
export const credentialService = new CredentialService();
