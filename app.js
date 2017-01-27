// Import the http library
var http = require('http');
var fs = require('fs');
var path = require('path');
    
// Create a server and provide it a callback to be executed for every HTTP request
// coming into localhost:3000.
var server = http.createServer(function(request, response){
    var headers = request.headers;
    var method = request.method;
    var url = request.url;
    
// PAGES
    if (method === 'GET' && url == '/playlists') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html');
        response.setHeader('Cache-Control', 'max-age=1800');
                
        var fPath = path.join(__dirname, 'playlist.html');
        fs.createReadStream(fPath).pipe(response);
    } else if (method === 'GET' && url == '/library') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html');
        response.setHeader('Cache-Control', 'max-age=1800');
        
        var fPath = path.join(__dirname, 'playlist.html');
        fs.createReadStream(fPath).pipe(response);
    } else if (method === 'GET' && url == '/search') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html');
        response.setHeader('Cache-Control', 'max-age=1800');
        
        var fPath = path.join(__dirname, 'playlist.html');
        fs.createReadStream(fPath).pipe(response);
    }
    
// APPLICATION LOGIC
    else if (method === 'GET' && url === '/music-app.js') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/javascript');
        response.setHeader('Cache-Control', 'max-age=1800');
        
        var fPath = path.join(__dirname, url);
        fs.createReadStream(fPath).pipe(response);
    }
    
// APPLICATION DATA (JSON)
    else if (method === 'GET' && url === '/api/songs') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'max-age=1800');
        
        var fPath = path.join(__dirname, 'songs.json');
        fs.createReadStream(fPath).pipe(response);
    } else if (method === 'GET' && url === '/api/playlists') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'max-age=1800');
        
        var fPath = path.join(__dirname, 'playlists.json');
        fs.createReadStream(fPath).pipe(response);
    } else if (method === 'POST' && url === '/api/playlists') {
        var body = [];
    
        // Handle POST, including error and data-stream
        request.on('data', function(data) {
            body.push(data);
        }).on('end', function(){
            data = Buffer.concat(body).toString();

            fs.writeFile('playlists.json', data, function(error) {
                if (error) {
                    response.statusCode = 400;
                    response.setHeader('Content-Type', 'text/plain');
                    response.end('Error updating file.');
                }
    
                response.statusCode = 200;
                response.setHeader('Content-Type', 'text/plain');
                response.end('Updated file successfully.');
            });
        }).on('error', function(err){
            console.log(err.stack);
            response.statusCode = 400;
            response.setHeader('Content-Type', 'text/plain');
            response.end('Bad JSON.');
        });
    }
    
// STYLESHEETS + IMAGES
    else if (method === 'GET' && url === '/playlist.css') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/css');
        response.setHeader('Cache-Control', 'max-age=1800');
        
        var fPath = path.join(__dirname, url);
        fs.createReadStream(fPath).pipe(response);
    } else if (method === 'GET' && url === '/img/playlist.jpg') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'image/jpeg');
        
        var fPath = path.join(__dirname, url);
        fs.createReadStream(fPath).pipe(response);
    } else if (method === 'GET' && url === '/img/song.jpg') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'image/jpeg');
        
        var fPath = path.join(__dirname, url);
        fs.createReadStream(fPath).pipe(response);
    }
    
// REDIRECT
    else if (method === 'GET' && url === '/') {
        response.statusCode = 301;
        response.setHeader('Content-Type', 'text/html');
        response.setHeader('Location', 'http://localhost:3000/playlists');
        response.end();
    }
    
// OTHER = 404 ERROR
    else {
        response.statusCode = 404;
        response.setHeader('Content-Type', 'text/html');
        response.end('<html><body><h1>404 Error</h1></body></html>');
    }
});
    
// Start the server on port 3000
server.listen(3000, function() {
    console.log('Amazing music app server listening on port 3000!')
});
