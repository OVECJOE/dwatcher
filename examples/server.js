import { createServer } from 'http';

const PORT = process.env.PORT || 3000;

// Simple routing
const routes = {
  '/': () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>dwatcher Example Server</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .status {
            background: #e8f5e8;
            color: #2d5a2d;
            padding: 10px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .dwatcher-info {
            background: #e3f2fd;
            color: #1565c0;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        pre {
            background: #f8f8f8;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 dwatcher Example Server</h1>
        <div class="status">
            ✅ Server is running on port ${PORT}
        </div>
        
        ${process.env.DWATCHER_RUNNING ? `
        <div class="dwatcher-info">
            🔄 <strong>Running under dwatcher!</strong><br>
            Try editing this file and see the automatic restart in action.
        </div>
        ` : ''}
        
        <h2>Available Routes:</h2>
        <ul>
            <li><a href="/">/ - This page</a></li>
            <li><a href="/api/status">/api/status - JSON status</a></li>
            <li><a href="/api/time">/api/time - Current time</a></li>
            <li><a href="/test">/test - Test page</a></li>
        </ul>
        
        <h2>Server Information:</h2>
        <pre>Node.js Version: ${process.version}
Platform: ${process.platform}
PID: ${process.pid}
Uptime: ${Math.floor(process.uptime())}s
Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB</pre>
        
        <p><em>Last updated: ${new Date().toLocaleString()}</em></p>
    </div>
</body>
</html>`;
  },
  
  '/api/status': () => {
    return JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      dwatcher: !!process.env.DWATCHER_RUNNING
    }, null, 2);
  },
  
  '/api/time': () => {
    return JSON.stringify({
      time: new Date().toISOString(),
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }, null, 2);
  },
  
  '/test': () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Page - dwatcher</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; }
        .test-box { 
            background: #f0f8ff; 
            padding: 20px; 
            border-radius: 8px;
            border-left: 4px solid #007acc;
        }
    </style>
</head>
<body>
    <h1>🧪 Test Page</h1>
    <div class="test-box">
        <p>This is a test page to verify file watching works correctly.</p>
        <p>Try modifying this content in <code>examples/server.js</code> and watch dwatcher restart the server automatically!</p>
        <p>Current time: ${new Date().toLocaleString()}</p>
    </div>
    <p><a href="/">← Back to home</a></p>
</body>
</html>`;
  }
};

const server = createServer((req, res) => {
  const url = req.url;
  const route = routes[url];
  
  // Enable CORS for API routes
  if (url.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (route) {
      res.writeHead(200);
      res.end(route());
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }
  
  // HTML routes
  res.setHeader('Content-Type', 'text/html');
  
  if (route) {
    res.writeHead(200);
    res.end(route());
  } else {
    res.writeHead(404);
    res.end(`
<!DOCTYPE html>
<html>
<head><title>404 - Not Found</title></head>
<body>
    <h1>404 - Page Not Found</h1>
    <p>The requested page <code>${url}</code> was not found.</p>
    <p><a href="/">← Go home</a></p>
</body>
</html>`);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Example server running on http://localhost:${PORT}`);
  console.log(`📝 Edit this file to see dwatcher in action!`);
  
  if (process.env.DWATCHER_RUNNING) {
    console.log(`🔄 Running under dwatcher - file changes will trigger restarts`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});