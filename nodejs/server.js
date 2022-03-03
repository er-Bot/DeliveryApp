const http = require('http');
var solver = require('./solver.js')
const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    switch(req.url){
        case "/paths":
            res.writeHead(200);
            var m = new solver.Solver('../data/test.txt', 30*60, 5);
            m.find_recommended_paths(5)
            res.end(JSON.stringify(m.get_response()))
            break
        default:
            res.writeHead(404);
            res.end("No Content, Check /paths")
    }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
