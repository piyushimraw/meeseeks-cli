import {Octokit} from '@octokit/rest';
import type {
  GitHubUser,
  GitHubVerificationResult,
  CopilotVerificationResult,
} from '../types/index.js';

export async function verifyGitHubPAT(
  pat: string,
): Promise<GitHubVerificationResult> {
  try {
    const octokit = new Octokit({
      auth: pat,
      userAgent: 'meeseeks-cli/1.0.0',
    });

    // Verify PAT by getting user info
    const {data: user} = await octokit.rest.users.getAuthenticated();

    const githubUser: GitHubUser = {
      login: user.login,
      id: user.id,
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      avatar_url: user.avatar_url,
    };

    // Check Copilot access
    const copilotResult = await verifyCopilotAccess(pat);

    return {
      success: true,
      user: githubUser,
      copilot: copilotResult,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function verifyCopilotAccess(
  pat: string,
): Promise<CopilotVerificationResult> {
  try {
    // The GitHub Copilot API endpoint for checking access
    // We'll make a request to the Copilot completions endpoint to verify access
    const response = await fetch(
      'https://api.githubcopilot.com/models',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${pat}`,
          'Content-Type': 'application/json',
          'User-Agent': 'meeseeks-cli/1.0.0',
        },
      },
    );

    if (response.ok) {
      return {
        hasAccess: true,
      };
    }

    // Check specific error codes
    if (response.status === 401) {
      return {
        hasAccess: false,
        error: 'PAT does not have Copilot permissions. Ensure your PAT has "Copilot Requests" permission.',
      };
    }

    if (response.status === 403) {
      return {
        hasAccess: false,
        error: 'No Copilot subscription found or access denied.',
      };
    }

    return {
      hasAccess: false,
      error: `Copilot API returned status ${response.status}`,
    };
  } catch (error) {
    // Network error or Copilot not available
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      hasAccess: false,
      error: `Could not verify Copilot access: ${message}`,
    };
  }
}

export async function testCopilotCompletion(
  pat: string,
): Promise<{success: boolean; message: string}> {
  try {
    const response = await fetch(
      'https://api.githubcopilot.com/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pat}`,
          'Content-Type': 'application/json',
          'User-Agent': 'meeseeks-cli/1.0.0',
          'Editor-Version': 'meeseeks/1.0.0',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: 'Say "Meeseeks connected!" in 5 words or less.',
            },
          ],
          max_tokens: 50,
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || 'Copilot responded!';
      return {
        success: true,
        message: content,
      };
    }

    return {
      success: false,
      message: `Copilot API returned status ${response.status}`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Could not test Copilot: ${message}`,
    };
  }
}
