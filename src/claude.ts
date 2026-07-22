import Anthropic from '@anthropic-ai/sdk';
import type { getMergedPullRequests } from './github.js';

const anthropic = new Anthropic();

type PullRequest = Awaited<ReturnType<typeof getMergedPullRequests>>[number];

export async function generateChangelog(repo: string, since: string, prs: PullRequest[]): Promise<string> {
  const prList = prs
    .map((pr) => `#${pr.number} "${pr.title}"`)
    .join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Generate a changelog for ${repo} since ${since} based on these merged pull requests:\n\n${prList}\n\nGroup them into categories (Features, Fixes, Improvements) and write in clear markdown.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}