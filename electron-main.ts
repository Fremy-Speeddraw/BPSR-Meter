import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { exec, fork, ChildProcess } from 'child_process';
import net from 'net';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to safely log to file in packaged environment
function logToFile(msg: string): void {
    // Only log in development mode
    const isDev = process.defaultApp || process.env.NODE_ENV === 'development';
    if (!isDev) return;

    try {
        const userData = app.getPath('userData');
        const logPath = path.join(userData, 'iniciar_log.txt');
        const timestamp = new Date().toISOString();
        fs.mkdirSync(userData, { recursive: true });
        fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
        console.log(msg);
    } catch (e) {
        console.error('Error writing log:', e);
        console.log(msg);
        try {
            const timestamp = new Date().toISOString();
            fs.appendFileSync('./iniciar_log.txt', `[${timestamp}] ${msg}\n`);
        } catch (e2) {
            console.error('Fallback log also failed:', e2);
        }
    }
}

let mainWindow: BrowserWindow | null;
let groupWindow: BrowserWindow | null;
let historyWindow: BrowserWindow | null;
let serverProcess: ChildProcess | null;
let server_port: number = 8989;
let lastMainWindowSize = { width: 650, height: 600 }; // Track last valid content size
let isLocked: boolean = false;
logToFile('==== ELECTRON START ====');

// Function to check if a port is in use
const checkPort = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close(() => resolve(true));
        });
        server.listen(port);
    });
};

async function findAvailablePort(): Promise<number> {
    let port = 8989;
    logToFile('Searching for available port starting from: ' + port);
    while (true) {
        logToFile('Checking port availability: ' + port);
        if (await checkPort(port)) {
            logToFile('Port ' + port + ' is available');
            return port;
        }
        logToFile('Port ' + port + ' is in use, trying next...');
        port++;
        if (port > 9000) {
            logToFile('ERROR: No available port found up to 9000');
            throw new Error('No available ports');
        }
    }
}

// Function to kill process using a specific port
async function killProcessUsingPort(port: number): Promise<void> {
    return new Promise((resolve) => {
        exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
            if (stdout) {
                const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
                if (lines.length > 0) {
                    const pid = lines[0].trim().split(/\s+/).pop();
                    if (pid) {
                        console.log(`Killing process ${pid} using port ${port}...`);
                        exec(`taskkill /PID ${pid} /F`, (killError, killStdout, killStderr) => {
                            if (killError) {
                                console.error(`Error killing process ${pid}: ${killError.message}`);
                            } else {
                                console.log(`Process ${pid} killed successfully.`);
                            }
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                } else {
                    resolve();
                }
            } else {
                resolve();
            }
        });
    });
}

async function createWindow(): Promise<void> {
    logToFile('=== STARTING CREATEWINDOW ===');
    logToFile('Node.js process: ' + process.version);
    logToFile('Electron version: ' + process.versions.electron);
    logToFile('Current directory: ' + __dirname);

    logToFile('Attempting to kill processes on port 8989...');
    await killProcessUsingPort(8989);

    server_port = await findAvailablePort();
    logToFile('Available port found: ' + server_port);

    mainWindow = new BrowserWindow({
        width: 650,
        height: 600,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        useContentSize: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'icon.ico'),
    });

    // Configure window to always be on top with maximum priority
    mainWindow.setAlwaysOnTop(true, 'screen-saver');

    // Make window click-through by default
    mainWindow.setIgnoreMouseEvents(false, { forward: true });

    // Determine absolute path to server.js based on environment
    // Since main is dist/electron-main.js, __dirname is dist/ in both dev and production
    const serverPath = path.join(__dirname, 'server.js');
    
    // Get user data path for storing settings and logs
    const userDataPath = app.getPath('userData');
    logToFile('User data path: ' + userDataPath);
    logToFile('Launching server.js on port ' + server_port + ' with path: ' + serverPath);

    serverProcess = fork(serverPath, [server_port.toString()], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        execArgv: [],
        env: {
            ...process.env,
            USER_DATA_PATH: userDataPath
        }
    });

    // Variables to control server startup
    let serverLoaded = false;
    const serverTimeout = setTimeout(() => {
        if (!serverLoaded && mainWindow) {
            logToFile('ERROR: Server did not respond in time (10s timeout)');
            mainWindow.loadURL('data:text/html,<h2 style="color:red">Error: Server did not respond in time.<br>Check iniciar_log.txt for details.</h2>');
        }
    }, 10000);

    serverProcess.stdout?.on('data', (data: Buffer) => {
        logToFile('SERVER STDOUT: ' + data.toString().trim());
        const match = data.toString().match(/Web server started at (http:\/\/localhost:\d+)/);
        if (match && match[1] && mainWindow) {
            const serverUrl = match[1];
            logToFile('Server started successfully. Loading URL: ' + serverUrl + '/index.html');
            mainWindow.loadURL(`${serverUrl}/index.html`);
            serverLoaded = true;
            clearTimeout(serverTimeout);
        }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
        logToFile('SERVER STDERR: ' + data.toString().trim());
    });

    serverProcess.on('error', (error: Error) => {
        logToFile('SERVER ERROR: ' + error.message);
        logToFile('ERROR STACK: ' + error.stack);
    });

    serverProcess.on('close', (code: number | null) => {
        logToFile('SERVER PROCESS CLOSED with code: ' + code);
    });

    serverProcess.on('exit', (code: number | null, signal: string | null) => {
        logToFile('SERVER PROCESS EXITED with code: ' + code + ', signal: ' + signal);
    });

    mainWindow.on('closed', () => {
        // Close group window if it's open
        if (groupWindow && !groupWindow.isDestroyed()) {
            groupWindow.close();
        }

        if (historyWindow && !historyWindow.isDestroyed()) {
            historyWindow.close();
        }

        mainWindow = null;
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            setTimeout(() => {
                if (serverProcess && !serverProcess.killed) {
                    serverProcess.kill('SIGKILL');
                }
            }, 5000);
        }
    });

    mainWindow.on('show', () => {
        if (mainWindow) {
            mainWindow.webContents.send('window-shown');
        }
    });

    mainWindow.on('focus', () => {
        if (mainWindow) {
            mainWindow.webContents.send('window-shown');
        }
    });

    // Handle close window event - works for any window
    ipcMain.on('close-window', (event: IpcMainEvent) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (senderWindow) {
            senderWindow.close();
        }
    });

    // Handle mouse events for interactive or click-through window - works for any window
    ipcMain.on('set-ignore-mouse-events', (event: IpcMainEvent, ignore: boolean, options?: { forward: boolean }) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (senderWindow) {
            senderWindow.setIgnoreMouseEvents(ignore, options);
        }
    });

    // Handle window position for manual dragging
    ipcMain.handle('get-window-position', (event: IpcMainInvokeEvent): { x: number; y: number } => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (senderWindow) {
            const [x, y] = senderWindow.getPosition();
            return { x, y };
        }
        return { x: 0, y: 0 };
    });

    // Handle lock state toggle
    ipcMain.on('toggle-lock-state', () => {
        if (mainWindow) {
            isLocked = !isLocked;
            mainWindow.setMovable(!isLocked);
            mainWindow.webContents.send('lock-state-changed', isLocked);
            console.log(`Lock: ${isLocked ? 'Locked' : 'Unlocked'}`);
        }
    });

    // Send initial lock state to renderer once window is ready
    mainWindow.webContents.on('did-finish-load', () => {
        if (mainWindow) {
            mainWindow.webContents.send('lock-state-changed', isLocked);
        }
    });

    ipcMain.on('resize-window-to-content', (_event: IpcMainEvent, width: number, height: number) => {
        if (mainWindow && width && height) {
            const targetWidth = Math.min(width + 10, 1200);
            const targetHeight = Math.min(height + 10, 800);
            mainWindow.setContentSize(targetWidth, targetHeight);

            setTimeout(() => {
                if (mainWindow) {
                    const bounds = mainWindow.getBounds();
                    lastMainWindowSize = { width: bounds.width, height: bounds.height };
                }
            }, 10);

            logToFile(`Main Window resized to: ${targetWidth}x${targetHeight}`);
        }
    });

    // Handle opening group management window
    ipcMain.on('open-group-window', () => {
        if (groupWindow) {
            groupWindow.focus();
            return;
        }

        groupWindow = new BrowserWindow({
            width: 480,
            height: 530,
            minWidth: 480,
            maxWidth: 480,
            minHeight: 530,
            maxHeight: 530,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            resizable: false,
            skipTaskbar: true,
            show: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
                contextIsolation: true
            },
            icon: path.join(__dirname, 'icon.ico'),
            title: 'Group Management',
        });

        groupWindow.setAlwaysOnTop(true, 'screen-saver');
        groupWindow.setIgnoreMouseEvents(false);

        groupWindow.on('will-resize', (event) => {
            event.preventDefault();
        });

        groupWindow.on('resize', () => {
            if (groupWindow) {
                const bounds = groupWindow.getBounds();
                if (bounds.width !== 480 || bounds.height !== 530) {
                    groupWindow.setBounds({ x: bounds.x, y: bounds.y, width: 480, height: 530 }, false);
                }
            }
        });

        groupWindow.once('ready-to-show', () => {
            if (groupWindow) {
                groupWindow.show();
                logToFile('Group window ready and shown');
            }
        });

        groupWindow.loadURL(`http://localhost:${server_port}/group.html`);

        groupWindow.on('closed', () => {
            groupWindow = null;
        });

        groupWindow.on('show', () => {
            if (groupWindow) {
                groupWindow.webContents.send('window-shown');
            }
        });

        groupWindow.on('focus', () => {
            if (groupWindow) {
                groupWindow.webContents.send('window-shown');
            }
        });

        logToFile('Group management window opened from http://localhost:' + server_port + '/group.html');
    });

    // Open History Window handler
    ipcMain.on('open-history-window', () => {
        if (historyWindow) {
            historyWindow.focus();
            return;
        }

        historyWindow = new BrowserWindow({
            width: 1125,
            height: 875,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            resizable: true,
            skipTaskbar: true,
            show: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
                contextIsolation: true
            },
            icon: path.join(__dirname, 'icon.ico'),
            title: 'Combat History',
        });

        historyWindow.setAlwaysOnTop(true, 'screen-saver');
        historyWindow.setIgnoreMouseEvents(false);

        historyWindow.once('ready-to-show', () => {
            if (historyWindow) {
                historyWindow.show();
                logToFile('History window ready and shown');
            }
        });

        historyWindow.on('resize', () => {
            if (historyWindow) {
                const bounds = historyWindow.getBounds();
                if (bounds.width !== 1125 || bounds.height !== 875) {
                    historyWindow.setBounds({ x: bounds.x, y: bounds.y, width: 1125, height: 875 }, false);
                }
            }
        });

        historyWindow.on('show', () => {
            if (historyWindow) {
                historyWindow.webContents.send('window-shown');
            }
        });

        historyWindow.on('focus', () => {
            if (historyWindow) {
                historyWindow.webContents.send('window-focused');
            }
        });

        historyWindow.on('closed', () => {
            historyWindow = null;
        });

        historyWindow.loadURL(`http://localhost:${server_port}/history.html`);

        historyWindow.on('closed', () => {
            historyWindow = null;
        });

        logToFile('History window opened from http://localhost:' + server_port + '/history.html');
    });

    ipcMain.on('set-window-position', (event: IpcMainEvent, x: number, y: number) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);

        if (senderWindow) {
            switch (senderWindow) {
                case groupWindow:
                    senderWindow.setBounds({
                        x: x,
                        y: y,
                        width: 480,
                        height: 530
                    }, false);
                    break;
                case historyWindow:
                    senderWindow.setBounds({
                        x: x,
                        y: y,
                        width: 1125,
                        height: 875
                    }, false);
                    break;
                case mainWindow:
                    senderWindow.setBounds({
                        x: x,
                        y: y,
                        width: lastMainWindowSize.width,
                        height: lastMainWindowSize.height
                    }, false);
                    break;
                default:
                    senderWindow.setPosition(x, y);
                    break;
            }
        }
    });
}

app.whenReady()
.then(() => {
    logToFile('Electron app ready, starting createWindow()');
    createWindow();

    app.on('activate', () => {
        logToFile('App activated');
        if (BrowserWindow.getAllWindows().length === 0) {
            logToFile('No windows found, creating new window');
            createWindow();
        }
    });
}).catch((error: Error) => {
    logToFile('ERROR in app.whenReady(): ' + error.message);
    logToFile('ERROR STACK: ' + error.stack);
});

app.on('window-all-closed', () => {
    logToFile('All windows closed');
    if (process.platform !== 'darwin') {
        logToFile('Closing application (not macOS)');
        app.quit();
    }
});

app.on('before-quit', () => {
    logToFile('App closing, cleaning up processes...');
});
