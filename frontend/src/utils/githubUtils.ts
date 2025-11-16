/**
 * Build a GitHub commit URL from repository URL and commit SHA
 */
export const buildGitHubCommitUrl = (repoUrl: string, commitSha: string): string => {
  // Remove trailing slash from repo URL
  const cleanUrl = repoUrl.replace(/\/$/, '');

  // Add /commit/{sha} to the URL
  return `${cleanUrl}/commit/${commitSha}`;
};
