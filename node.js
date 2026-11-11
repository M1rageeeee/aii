// server.js  —  запуск: API_KEY=ваш_ключ node server.js
const http = require('http');
const fs = require('fs');

const API_KEY = process.env.API_KEY;
const PORT = 3000;

http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync('index.html'));
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(body);
        const apiRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',   // актуальное имя модели
            messages,
            stream: true
          })
        });

        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked'
        });

        const reader = apiRes.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream:true });
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content;
              if (delta) res.write(delta);
            } catch {}
          }
        }
        res.end();
      } catch (e) {
        res.writeHead(500).end('Server error');
      }
    });
    return;
  }
  res.writeHead(404).end();
}).listen(PORT, () => console.log('http://localhost:' + PORT));