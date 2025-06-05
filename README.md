# dwatcher

**Lightweight, performant Node.js file watcher with intelligent debouncing**

A zero-dependency alternative to nodemon that focuses on efficiency, simplicity, and smart file change detection. Built with modern ES modules and functional programming principles.

## ⚡ Key Features

- **Zero Dependencies** - No external packages required
- **Intelligent Debouncing** - Waits for file change bursts to complete before restarting
- **High Performance** - Efficient file watching with minimal resource usage
- **Framework Agnostic** - Works with any Node.js application or framework
- **ES Module Native** - Built for modern JavaScript
- **Configurable** - Flexible ignore patterns and watch settings
- **Production Ready** - Can be installed as a regular dependency, not just dev dependency

## 🚀 Installation

```bash
# npm
npm install @dwatcher/core

# yarn
yarn add @dwatcher/core

# pnpm
pnpm add @dwatcher/core
```

## 📖 Usage

### Command Line

```bash
# Basic usage
dwatcher node server.js

# With arguments
dwatcher node app.js --port 3000

# With npm scripts
dwatcher "npm start"

# With custom debounce timing
dwatcher node server.js --debounce 500

# Verbose mode
dwatcher node server.js --verbose

# Watch specific directory
dwatcher node server.js --watch ./src
```

### Programmatic API

```javascript
import { dwatcher } from '@dwatcher/core';

// Basic usage
await dwatcher('node', ['server.js']);

// With options
await dwatcher('node', ['app.js'], {
  debounceMs: 500,
  verbose: true,
  ignorePatterns: ['*.log', 'temp/**'],
  watchExtensions: ['.js', '.json', '.ts']
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "dwatcher node server.js",
    "dev:verbose": "dwatcher node server.js --verbose",
    "start:watch": "dwatcher npm start"
  }
}
```

## ⚙️ Configuration Options

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--debounce <ms>` | Debounce delay in milliseconds | `300` |
| `--ignore <pattern>` | Add ignore pattern (repeatable) | See defaults |
| `--ext <extensions>` | Watch specific extensions | `.js,.mjs,.json,.ts,.jsx,.tsx` |
| `--verbose` | Enable verbose logging | `false` |
| `--no-clear` | Don't clear console on restart | `false` |
| `--watch <path>` | Watch specific directory | Current directory |

### Programmatic Options

```javascript
const options = {
  debounceMs: 300,           // Debounce delay
  verbose: false,            // Verbose logging
  clear: true,              // Clear console on restart
  watchPath: process.cwd(), // Directory to watch
  ignorePatterns: [         // Patterns to ignore
    'node_modules/**',
    '.git/**',
    '*.log',
    'dist/**',
    'build/**'
  ],
  watchExtensions: [        // File extensions to watch
    '.js', '.mjs', '.json', 
    '.ts', '.jsx', '.tsx'
  ]
};
```

## 🎯 How It Works

### Intelligent Debouncing

Unlike traditional file watchers that restart immediately on any change, dwatcher uses intelligent debouncing:

1. **File Change Detected** - dwatcher notices a file change
2. **Debounce Timer Started** - Waits for the configured debounce period
3. **Additional Changes** - If more changes occur, the timer resets
4. **Quiet Period** - Once no changes occur for the debounce period, restart happens
5. **Single Restart** - Only one restart occurs regardless of how many files changed

This prevents rapid restarts during bulk operations like:
- Git operations (checkout, merge, pull)
- Package installations
- Build processes that modify multiple files
- IDE auto-save bursts

### Smart File Watching

- **Recursive Directory Scanning** - Automatically discovers new directories
- **Efficient Pattern Matching** - Fast ignore pattern processing
- **Extension Filtering** - Only watches relevant file types
- **Auto-refresh** - Periodically updates watchers for new directories

## 🔧 Environment Variables

When your application runs under dwatcher, the environment variable `DWATCHER_RUNNING` is set to `'1'`. You can use this to modify behavior:

```javascript
if (process.env.DWATCHER_RUNNING) {
  console.log('Running in development mode with dwatcher');
}
```

## 📝 Examples

### Basic Express Server

```javascript
// server.js
import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

```bash
dwatcher node server.js
```

### Next.js Development

```bash
dwatcher "npm run dev"
```

### TypeScript Project

```bash
dwatcher node --loader ts-node/esm app.ts --ext .js,.ts,.json
```

### Custom Configuration

```bash
dwatcher node server.js \
  --debounce 1000 \
  --ignore "logs/**" \
  --ignore "*.tmp" \
  --ext .js,.json \
  --verbose
```

## 🆚 vs Nodemon

| Feature | dwatcher | nodemon |
|---------|----------|---------|
| Dependencies | 0 | 30+ |
| Bundle Size | ~15KB | ~2MB+ |
| Debouncing | Intelligent | Basic |
| ES Modules | Native | Partial |
| Configuration | Simple | Complex |
| Performance | High | Moderate |
| Memory Usage | Low | Higher |

## 🤝 Contributing

Contributions are welcome! This project follows functional programming principles and avoids OOP patterns. Please ensure:

- Use ES modules only
- No external dependencies
- Functional programming style
- Comprehensive error handling
- Performance considerations

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/OVECJOE/dwatcher)
- [npm Package](https://www.npmjs.com/package/@dwatcher/core)
- [Issue Tracker](https://github.com/OVECJOE/dwatcher/issues)

---

**dwatcher** - Built for modern Node.js development 🚀