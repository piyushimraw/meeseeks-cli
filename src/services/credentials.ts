import { Entry } from '@napi-rs/keyring';

const SERVICE_PREFIX = 'meeseeks';

export interface Credential {
  service: string;   // e.g., 'jira', 'squadcast'
  account: string;   // e.g., 'api-token', 'url'
  secret: string;
}

export class CredentialService {
  private getEntry(service: string, account: string): Entry {
    // Namespace all entries with app prefix to avoid conflicts
    return new Entry(`${SERVICE_PREFIX}-${service}`, account);
  }

  /**
   * Store a credential in the OS keychain
   * Note: @napi-rs/keyring operations are synchronous but we wrap in async
   * for consistent API and future-proofing
   */
  async store(cred: Credential): Promise<void> {
    const entry = this.getEntry(cred.service, cred.account);
    entry.setPassword(cred.secret);
  }

  /**
   * Retrieve a credential from the OS keychain
   * Returns null if not found
   */
  async retrieve(service: string, account: string): Promise<string | null> {
    try {
      const entry = this.getEntry(service, account);
      return entry.getPassword();
    } catch {
      // Entry not found or keychain error
      return null;
    }
  }

  /**
   * Delete a credential from the OS keychain
   * Returns true if deleted, false if not found
   */
  async delete(service: string, account: string): Promise<boolean> {
    try {
      const entry = this.getEntry(service, account);
      entry.deletePassword();
      return true;
    } catch {
      return false;
    }
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
