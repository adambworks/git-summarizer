import { createServer } from 'node:http';

const server = createServer((req, res) => {
    if (req.method == 'GET' && req.url === '/health'){
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello World!\n');
        return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3000);