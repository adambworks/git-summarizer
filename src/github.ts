
import { Octokit } from '@octokit/rest';

const octokit = new Octokit();

export async function getMergedPullRequests(owner: string, repo: string, since: string) {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: 'closed',
    per_page: 20,
  });

  return data.filter((pr) => {
    if (pr.merged_at == null) return false;
    return new Date(pr.merged_at) >= new Date(since);
  });
}