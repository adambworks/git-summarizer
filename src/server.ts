import { Octokit } from '@octokit/rest';

import { createServer } from 'node:http';
import { getMergedPullRequests } from './github';
import { generateChangelog } from './claude';
import { readBody } from './http';
import { error } from 'node:console';

const octokit = new Octokit();




function validateRepo(repo: unknown): { valid: true; owner: string; name: string } | { valid: false; error: string } {
  if (typeof repo !== 'string') {
    return { valid: false, error: 'repo must be a string' };
  }
  const parts = repo.split('/');
  if (parts.length !== 2) {
    return { valid: false, error: 'repo needs to be in form owner/name' };
  }
  return { valid: true, owner: parts[0], name: parts[1] };
}

function validateSince(since: unknown): {valid: true; date:string} | { valid: false; error: string } {
  if (typeof since !== 'string') {
    return { valid: false, error: 'since must be a string' };
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    return { valid: false, error: 'since must be in YYYY-MM-DD formate' };
  }
  if (isNaN(new Date(since).getTime())) {
    return { valid: false, error: 'since must be a valid date' };
  }
  return {valid:true,date: since};
  
}




const server = createServer(async (req, res) => {

    const url = new URL(req.url ?? '', `http://${req.headers.host}`);

    if (req.method == 'GET' && req.url === '/health'){
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello World!\n');
        return;
    }
    //GET /changelog/preview?repo=owner/name&since=YYYY-MM-DD
    if (req.method === 'GET' && url.pathname === '/changelog/preview') {
  const repo = url.searchParams.get('repo');
  const repo_validated = validateRepo(repo);
  if (!repo_validated.valid) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: repo_validated.error }));
    return;
  }

  const since = url.searchParams.get('since');
  const since_validated = validateSince(since);
  if (!since_validated.valid) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: since_validated.error }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ repo: repo_validated.owner + '/' + repo_validated.name, since: since_validated.date }));
  return;
}

// GET /changelog?repo=owner/name&since=YYYY-MM-DD
if (req.method === 'GET' && url.pathname === '/changelog') {
  const repo = url.searchParams.get('repo');
  const repo_validated = validateRepo(repo);
  if (!repo_validated.valid) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: repo_validated.error }));
    return;
  }

  const since = url.searchParams.get('since');
  const since_validated = validateSince(since);
  if (!since_validated.valid) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: since_validated.error }));
    return;
  }

  try {
    const prs = await getMergedPullRequests(repo_validated.owner, repo_validated.name, since_validated.date);
    const summarized_changelog = await generateChangelog(
      `${repo_validated.owner}/${repo_validated.name}`,
      since_validated.date,
      prs,
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ repo: `${repo_validated.owner}/${repo_validated.name}`, since: since_validated.date, summarized_changelog }));
  } catch (err) {
    console.error('Changelog generation failed:', err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to generate changelog' }));
  }
  return;
}

    if(req.method === 'POST' && url.pathname==='/changelog/generate'){
        let json_data;
        try {
            json_data = JSON.parse(await readBody(req));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
        }
        if (typeof json_data.repo !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'repo must be a string' }));
            return;
        }

        if (typeof json_data.since !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'since must be a string' }));
            return;
        }
        const repo_validated= validateRepo(json_data.repo);
        if(!repo_validated.valid){
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error:repo_validated.error }));
            return;
        }
        const since_validated = validateSince(json_data.since)
        if(!since_validated.valid){
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error:since_validated.error }));
            return;
        }


         try {
            const prs = await getMergedPullRequests(repo_validated.owner, repo_validated.name, json_data.since);
            
            try{
                const summarized_changelog= await generateChangelog(json_data.repo,json_data.since,prs);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                repo: json_data.repo,
                since: json_data.since,
                summarized_changelog,
                }));            
            } catch(err){
                console.error('Claud failed:', err);
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to call claude' }));

            }



            } catch (err) {
            console.error('GitHub fetch failed:', err);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch pull requests from GitHub' }));
            }
    }


    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3000);