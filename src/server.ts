import { Octokit } from '@octokit/rest';

import { createServer } from 'node:http';
import { getMergedPullRequests } from './github';

const octokit = new Octokit();

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
        if (repo == null){
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end("no repo provided");
            return;
        }
        const parsedRepo : string[] = repo.split("/");
        if(parsedRepo.length!=2){
          res.writeHead(400, { 'Content-Type': 'text/plain' } );
            res.end("repo needs to be in form owner/name");
            return;  
        }
        
        const since = url.searchParams.get('since');
        if (since == null){
            res.writeHead(400, { 'Content-Type': 'text/plain' } );
            res.end("no since provided");
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'since must be in YYYY-MM-DD format' }));
        return;
        }
        const parsedDate = new Date(since);
        if (isNaN(parsedDate.getTime())){
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'since must be a valid date in form YYYY-MM-DD' }));
            return;

        }
         res.writeHead(200, { 'Content-Type': 'application/json' });
         res.end(JSON.stringify({ repo, since })+'\n'); //{repo, since} =={repo: repo, since:since}
        return;
  
    }


    if(req.method === 'GET' && url.pathname === '/changelog'){
       const repo = url.searchParams.get('repo');
        if (repo == null){
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end("no repo provided");
            return;
        }
        const parsedRepo : string[] = repo.split("/");
        if(parsedRepo.length!=2){
          res.writeHead(400, { 'Content-Type': 'text/plain' } );
            res.end("repo needs to be in form owner/name");
            return;  
        }
        
        const since = url.searchParams.get('since');
        if (since == null){
            res.writeHead(400, { 'Content-Type': 'text/plain' } );
            res.end("no since provided");
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'since must be in YYYY-MM-DD format' }));
        return;
        }
        const parsedDate = new Date(since);
        if (isNaN(parsedDate.getTime())){
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'since must be a valid date in form YYYY-MM-DD' }));
            return;


        }
        try {
            const prs = await getMergedPullRequests(parsedRepo[0], parsedRepo[1], since);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ repo, since, prs }));
            } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch pull requests from GitHub' }));
            }
            return;
    }


    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3000);