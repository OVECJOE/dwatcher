import { resolve, join, dirname } from 'path';
import { readdir, stat } from 'fs/promises';
import { watch } from 'fs';
import { spawn } from 'child_process';

// Configuration defaults
const DEFAULT_CONFIG = {
    debounceMs: 300,
    ignorePatterns: [
        'node_modules/**',
        '.git/**',
        '*.log',
        'dist/**',
        'build/**',
        'coverage/**',
        '.nyc_output/**',
        '*.tmp',
        '*.temp',
    ],
    watchExtensions: ['.js', '.mjs', '.json', '.ts', '.jsx', '.tsx'],
    verbose: false,
    clear: true
}

let childProcess = null;
let debounceTimer = null;
let isRestarting = false;
let fileWatchers = new Set();

/**
 * Check if a file path should be ignored based on patterns
 * @param {string} filePath - The file path to check
 * @param {Array<string>} ignorePatterns - Patterns to ignore
 * @returns {boolean} - True if the file should be ignored, false otherwise
 */
function shouldIgnore(filePath, ignorePatterns) {
    return ignorePatterns.some(pattern => {
        if (pattern.includes('**')) {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
            return regex.test(filePath);
        }
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(filePath);
        }
        return filePath.includes(pattern);
    })
}

/**
 * Checks if file extension is watched
 * @param {string} filePath - The file path to check
 * @param {Array<string>} watchExtensions - Extensions to watch
 * @returns {boolean} - True if the file extension is watched, false otherwise
 */
function shouldWatch(filePath, watchExtensions) {
    if (watchExtensions.length === 0) return true;
    return watchExtensions.some(ext => filePath.endsWith(ext));
}

/**
 * Recursively gets all directories to watch
 * @param {string} rootPath - The root directory to start from
 * @param {Array<string>} ignorePatterns - Patterns to ignore
 * @returns {Promise<Array<string>>} - List of directories to watch
 */
async function getWatchDirectories(rootPath, ignorePatterns) {
    const directories = [rootPath];

    async function traverse(dirPath) {
        try {
            const entries = await readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                
                const fullPath = join(dirPath, entry.name);
                if (shouldIgnore(fullPath.replace(rootPath, '').replace(/^\//, ''), ignorePatterns)) {
                    continue;
                }

                directories.push(fullPath);
                await traverse(fullPath);
            }
        } catch {}
    }

    await traverse(rootPath);
    return directories;
}

/**
 * Starts the target application/server
 * @param {string} command - The command to run
 * @param {Array<string>} args - Arguments for the command
 * @param {Object} options - Options for the watcher
 * @param {boolean} options.clear - Whether to clear the console before starting
 * @param {boolean} options.verbose - Whether to log verbose output
 * @return {void}
 */
function startTargetApp(command, args, options) {
    if (childProcess) killTargetApp();
    if (options.clear && process.stdout.isTTY) {
        process.stdout.write('\x1Bc'); // Clear console
    }

    if (options.verbose) {
        console.log(`\x1b[36m[dwatcher]\x1b[0m Starting: ${command} ${args.join(' ')}`);
    }

    childProcess = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, DWATCHER_RUNNING: '1' }
    })

    childProcess.on('exit', (code, signal) => {
        if (!isRestarting && code !== 0 && signal !== 'SIGTERM') {
            if (options.verbose) {
                console.log(`\x1b[31m[dwatcher]\x1b[0m Process exited with code ${code}`);
            }
        }
        childProcess = null;
    })

    childProcess.on('error', (err) => {
        console.error(`\x1b[31m[dwatcher]\x1b[0m Failed to start process: ${err.message}`);
        childProcess = null;
    })
}

/**
 * Kills the target application/server
 * @return {void}
 */
function killTargetApp() {
    if (!childProcess) return;
    isRestarting = true;

    // Try graceful shutdown first
    childProcess.kill('SIGTERM');

    // Force kill after timeout
    setTimeout(() => {
        if (childProcess && !childProcess.killed) {
            childProcess.kill('SIGKILL');
            if (childProcess.stdout) childProcess.stdout.destroy();
            if (childProcess.stderr) childProcess.stderr.destroy();
            childProcess = null;
        }
        isRestarting = false;
    }, 5000);
}

/**
 * Handles file change events with debouncing
 * @param {string} filename - The name of the changed file
 * @param {string} eventType - The type of event (e.g., 'change', 'rename')
 * @param {Object} options - Options for the watcher
 * @param {string} command - The command to run
 * @param {Array<string>} args - Arguments for the command
 * @return {void}
 */
function handleFileChange(filename, eventType, options, command, args) {
    if (isRestarting) return;
    if (debounceTimer) clearTimeout(debounceTimer);

    if (options.verbose) {
        console.log(`\x1b[36m[dwatcher]\x1b[0m Detected ${eventType} on: ${filename}`);
    }

    // Set new debounce timer
    debounceTimer = setTimeout(() => {
        if (options.verbose) {
            console.log(`\x1b[32m[dwatcher]\x1b[0m Restarting due to changes...`);
        }

        startTargetApp(command, args, options);
    }, options.debounceMs);
}

/**
 * Sets up file watchers for directories
 * @param {Array<string>} directories - List of directories to watch
 * @param {Object} options - Options for the watcher
 * @param {string} command - The command to run
 * @param {Array<string>} args - Arguments for the command
 * @return {Promise<void>}
 */
async function setupWatchers(directories, options, command, args) {
    // Clean up existing watchers
    fileWatchers.forEach(watcher => watcher.close());
    fileWatchers.clear();

    for (const directory of directories) {
        try {
            const watcher = watch(directory, { recursive: true }, (eventType, filename) => {
                if (!filename) return;

                const fullPath = join(directory, filename);
                const relativePath = fullPath.replace(process.cwd() + '/', '');

                // Check ignore patterns and extensions
                if (shouldIgnore(relativePath, options.ignorePatterns)) returns;
                if (!shouldWatch(relativePath, options.watchExtensions)) return;

                handleFileChange(relativePath, eventType, options, command, args);
            })

            fileWatchers.add(watcher);
            watcher.on('error', (err) => {
                if (options.verbose) {
                    console.error(`\x1b[31m[dwatcher]\x1b[0m Error watching ${directory}: ${err.message}`);
                }
            });
        } catch (err) {
            if (options.verbose) {
                console.error(`\x1b[31m[dwatcher]\x1b[0m Failed to watch directory ${directory}: ${err.message}`);
            }
        }
    }

    if (options.verbose) {
        console.log(`\x1b[36m[dwatcher]\x1b[0m Watching ${fileWatchers.size} directories`);
    }
}

/**
 * Main function to start the watcher
 * @param {string} command - The command to run
 * @param {Array<string>} args - Arguments for the command
 * @param {Object} options - Options for the watcher
 * @return {Promise<void>}
 */
export async function dwatcher(command, args = [], options = {}) {
    const config = { ...DEFAULT_CONFIG, ...options };
    const watchPath = resolve(config.watchPath || process.cwd());

    // Validate command
    if (!command) {
        throw new Error('No command specified to run');
    }

    console.log(`\x1b[36m[dwatcher]\x1b[0m Starting watcher for: ${command} ${args.join(' ')}`);

    try {
        const directories = await getWatchDirectories(watchPath, config.ignorePatterns);
        await setupWatchers(directories, config , command, args);
        startTargetApp(command, args, config);

        // Handle process termination
        const cleanup = () => {
            console.log(`\x1b[36m[dwatcher]\x1b[0m Shutting down...`);
            if (debounceTimer) clearTimeout(debounceTimer);

            // Close file watchers
            fileWatchers.forEach(watcher => watcher.close());
            fileWatchers.clear();

            killTargetApp();
            setTimeout(() => process.exit(0), 1000);
        }

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('SIGHUP', cleanup);

        // Periodically refresh watchers to catch new directories
        setInterval(async () => {
            try {
                const newDirectories = await getWatchDirectories(watchPath, config.ignorePatterns);
                if (newDirectories.length !== fileWatchers.size) {
                    if (config.verbose) {
                        console.log(`\x1b[36m[dwatcher]\x1b[0m Refreshing watchers, found ${newDirectories.length} directories`);
                    }
                    await setupWatchers(newDirectories, config, command, args);
                }
            } catch (err) {
                if (config.verbose) {
                    console.warn(`\x1b[31m[dwatcher]\x1b[0m Failed to refresh watchers: ${err.message}`);
                }
            }
        }, 30000); // Refresh every 30 seconds
    } catch (err) {
        console.error(`\x1b[31m[dwatcher]\x1b[0m Failed to initialize: ${err.message}`);
        process.exit(1);
    }
}

/**
 * CLI helper function to run dwatcher
 */
export function createCLI() {
    return {
        run: async (argv) => {
            const args = argv.slice(2);
            if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
                console.log(`
        \x1b[36mdwatcher\x1b[0m - Lightweight Node.js file watcher and auto-restarter
        
        Usage: dwatcher <command> [arguments] [options]
        
        Examples:
          dwatcher node server.js
          dwatcher "npm start"
          dwatcher node app.js --verbose
          dwatcher "node server.js --port 3000" --debounce 500
        
        Options:
          --debounce <ms>     Debounce delay in milliseconds (default: 300)
          --ignore <pattern>  Add ignore pattern (can be used multiple times)
          --ext <extensions>  Watch specific extensions (default: .js,.mjs,.json,.ts,.jsx,.tsx)
          --verbose           Enable verbose logging
          --no-clear          Don't clear console on restart
          --watch <path>      Watch specific directory (default: current directory)
          --help, -h          Show this help message
        
        Environment Variables:
          DWATCHER_RUNNING    Set to '1' when your app is running under dwatcher
                `);
                return;
            }

            let command = '';
            let commandArgs = [];
            const options = {};

            let i = 0;
            while (i < args.length) {
                const arg = args[i];
                if (arg.startsWith('--')) {
                    switch (arg) {
                        case '--debounce':
                            options.debounceMs = parseInt(args[++i], 10) || DEFAULT_CONFIG.debounceMs;
                            break;
                        case '--ignore':
                            options.ignorePatterns = options.ignorePatterns || [...DEFAULT_CONFIG.ignorePatterns];
                            options.ignorePatterns.push(args[++i]);
                            break;
                        case '--ext':
                            options.watchExtensions = args[++i].split(',').map(ext => ext.startsWith('.') ? ext : `.${ext}`);
                            break;
                        case '--verbose':
                            options.verbose = true;
                            break;
                        case '--no-clear':
                            options.clear = false;
                            break;
                        case '--watch':
                            options.watchPath = args[++i];
                            break;
                        default:
                            console.warn(`Unknown option: ${arg}`);
                    }
                } else {
                    if (!command) {
                        command = arg;
                    } else {
                        commandArgs.push(arg);
                    }
                }
                i++;
            }

            if (!command) {
                console.error('No command specified to run');
                process.exit(1);
            }

            // Handle quoted commands (e.g., "npm start")
            if (command.includes(' ') && commandArgs.length === 0) {
                const parts = command.split(' ');
                command = parts[0];
                commandArgs = parts.slice(1);
            }

            await dwatcher(command, commandArgs, options);
        }
    }
}
