const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
exports.startServer = async function () {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const parts=pathname.split('/');
      if(parts.some(p=>p.startsWith('.') || p==='node_modules'))throw new Error('private path');
      const file=path.resolve(root, '.'+(pathname==='/'?'/gallery.html':pathname));
      if(!file.startsWith(root+path.sep))throw new Error('outside root');
      const content=await fs.readFile(file);
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
    } catch { res.writeHead(404);res.end('Not found'); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
};
