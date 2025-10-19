import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { Logger, GlobalSettings, ApiResponse } from '../types/index';
import type { UserDataManager } from './dataManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use user data path in production, current directory in development
const USER_DATA_DIR = process.env.NODE_ENV === 'development' ? process.cwd() : process.env.USER_DATA_PATH;
const SETTINGS_PATH = path.join(USER_DATA_DIR, 'settings.json');

interface ErrorWithCode extends Error {
    code?: string;
}

function initializeApi(
    app: Express,
    server: HTTPServer,
    io: SocketIOServer,
    userDataManager: UserDataManager,
    logger: Logger,
    globalSettings: GlobalSettings
): void {
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '..', '..', 'public')));

    app.get('/icon.png', (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '..', '..', 'icon.png'));
    });

    app.get('/favicon.ico', (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '..', '..', 'icon.ico'));
    });

    app.get('/api/data', (req: Request, res: Response) => {
        const userData = userDataManager.getAllUsersData();
        const data: ApiResponse = {
            code: 0,
            user: userData,
            timestamp: Date.now(),
            startTime: userDataManager.startTime
        };
        res.json(data);
    });

    app.get('/api/solo-user', (req: Request, res: Response) => {
        const soloData = userDataManager.getSoloUserData();
        const data: ApiResponse = {
            code: 0,
            user: soloData,
            timestamp: Date.now(),
            startTime: userDataManager.startTime
        };
        res.json(data);
    });

    app.get('/api/debug/status', (req: Request, res: Response) => {
        const allUsers = userDataManager.getAllUsersData();
        const localUid = userDataManager.localPlayerUid;
        const userCount = Object.keys(allUsers).length;
        
        res.json({
            code: 0,
            localPlayerUid: localUid,
            totalUsersTracked: userCount,
            userIds: Object.keys(allUsers),
            hasLocalPlayer: localUid ? allUsers.hasOwnProperty(localUid) : false
        });
    });

    app.get('/api/enemies', (req: Request, res: Response) => {
        const enemiesData = userDataManager.getAllEnemiesData();
        const data: ApiResponse = {
            code: 0,
            enemy: enemiesData,
        };
        res.json(data);
    });

    app.get('/api/clear', async (req: Request, res: Response) => {
        await userDataManager.clearAll();
        console.log('Statistics cleared!');
        res.json({
            code: 0,
            msg: 'Statistics cleared!',
        });
    });

    app.get('/api/reset', async (req: Request, res: Response) => {
        await userDataManager.resetStatistics();
        console.log('Statistics reset (keeping player info)!');
        res.json({
            code: 0,
            msg: 'Statistics reset!',
        });
    });

    app.post('/api/pause', (req: Request, res: Response) => {
        const { paused } = req.body;
        globalSettings.isPaused = paused;
        console.log(`Statistics ${globalSettings.isPaused ? 'paused' : 'resumed'}!`);
        res.json({
            code: 0,
            msg: `Statistics ${globalSettings.isPaused ? 'paused' : 'resumed'}!`,
            paused: globalSettings.isPaused,
        });
    });

    app.get('/api/pause', (req: Request, res: Response) => {
        res.json({
            code: 0,
            paused: globalSettings.isPaused,
        });
    });

    app.post('/api/set-username', (req: Request, res: Response) => {
        const { uid, name } = req.body;
        if (uid && name) {
            const userId = parseInt(uid, 10);
            if (!isNaN(userId)) {
                userDataManager.setName(userId, name);
                console.log(`Manually assigned name '${name}' to UID ${userId}`);
                res.json({ code: 0, msg: 'Username updated successfully.' });
            } else {
                res.status(400).json({ code: 1, msg: 'Invalid UID.' });
            }
        } else {
            res.status(400).json({ code: 1, msg: 'Missing UID or name.' });
        }
    });

    app.get('/api/skill/:uid', (req: Request, res: Response) => {
        const uid = parseInt(req.params.uid);
        const skillData = userDataManager.getUserSkillData(uid);

        if (!skillData) {
            return res.status(404).json({
                code: 1,
                msg: 'User not found',
            });
        }

        res.json({
            code: 0,
            data: skillData,
        });
    });

    app.get('/api/skills', (req: Request, res: Response) => {
        const userData = userDataManager.getAllUsersData();
        const skillsData: Record<string, any> = {};
        
        for (const [uid, user] of Object.entries(userData)) {
            if ((user.total_damage && user.total_damage.total > 0) || 
                (user.taken_damage > 0) || 
                (user.total_healing && user.total_healing.total > 0)) {
                skillsData[uid] = userDataManager.getUserSkillData(parseInt(uid));
            }
        }
        
        const data: ApiResponse = {
            code: 0,
            data: { skills: skillsData },
            timestamp: Date.now(),
            startTime: userDataManager.startTime
        };
        res.json(data);
    });

    app.get('/api/history/:timestamp/summary', async (req: Request, res: Response) => {
        const { timestamp } = req.params;
        const historyFilePath = path.join(USER_DATA_DIR, 'logs', timestamp, 'summary.json');

        try {
            const data = await fsPromises.readFile(historyFilePath, 'utf8');
            const summaryData = JSON.parse(data);
            res.json({
                code: 0,
                data: summaryData,
            });
        } catch (error) {
            const err = error as ErrorWithCode;
            if (err.code === 'ENOENT') {
                logger.warn('History summary file not found:', error);
                res.status(404).json({
                    code: 1,
                    msg: 'History summary file not found',
                });
            } else {
                logger.error('Failed to read history summary file:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to read history summary file',
                });
            }
        }
    });

    app.get('/api/history/:timestamp/data', async (req: Request, res: Response) => {
        const { timestamp } = req.params;
        const historyFilePath = path.join(USER_DATA_DIR, 'logs', timestamp, 'allUserData.json');

        try {
            const data = await fsPromises.readFile(historyFilePath, 'utf8');
            const userData = JSON.parse(data);
            res.json({
                code: 0,
                user: userData,
            });
        } catch (error) {
            const err = error as ErrorWithCode;
            if (err.code === 'ENOENT') {
                logger.warn('History data file not found:', error);
                res.status(404).json({
                    code: 1,
                    msg: 'History data file not found',
                });
            } else {
                logger.error('Failed to read history data file:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to read history data file',
                });
            }
        }
    });

    app.get('/api/history/:timestamp/skill/:uid', async (req: Request, res: Response) => {
        const { timestamp, uid } = req.params;
        const historyFilePath = path.join(USER_DATA_DIR, 'logs', timestamp, 'users', `${uid}.json`);

        try {
            const data = await fsPromises.readFile(historyFilePath, 'utf8');
            const skillData = JSON.parse(data);
            res.json({
                code: 0,
                data: skillData,
            });
        } catch (error) {
            const err = error as ErrorWithCode;
            if (err.code === 'ENOENT') {
                logger.warn('History skill file not found:', error);
                res.status(404).json({
                    code: 1,
                    msg: 'History skill file not found',
                });
            } else {
                logger.error('Failed to read history skill file:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to load history skill file',
                });
            }
        }
    });

    app.get('/api/history/:timestamp/download', async (req: Request, res: Response) => {
        const { timestamp } = req.params;
        const historyFilePath = path.join(USER_DATA_DIR, 'logs', timestamp, 'fight.log');
        res.download(historyFilePath, `fight_${timestamp}.log`);
    });

    app.get('/api/history/list', async (req: Request, res: Response) => {
        try {
            const logsDir = path.join(USER_DATA_DIR, 'logs');
            const data = (await fsPromises.readdir(logsDir, { withFileTypes: true }))
                .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
                .map((e) => e.name);
            res.json({
                code: 0,
                data: data,
            });
        } catch (error) {
            const err = error as ErrorWithCode;
            if (err.code === 'ENOENT') {
                logger.warn('History path not found:', error);
                res.status(404).json({
                    code: 1,
                    msg: 'History path not found',
                });
            } else {
                logger.error('Failed to load history path:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to load history path',
                });
            }
        }
    });

    app.get('/api/settings', async (req: Request, res: Response) => {
        res.json({ code: 0, data: globalSettings });
    });

    app.post('/api/settings', async (req: Request, res: Response) => {
        const newSettings = req.body;
        Object.assign(globalSettings, newSettings);
        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        res.json({ code: 0, data: globalSettings });
    });

    app.get('/api/translations/:lang', async (req: Request, res: Response) => {
        const { lang } = req.params;
        const translationPath = path.join(__dirname, '..', '..', 'translations', `${lang}.json`);
        
        try {
            const data = await fsPromises.readFile(translationPath, 'utf8');
            res.json({
                code: 0,
                data: JSON.parse(data)
            });
        } catch (error) {
            const err = error as ErrorWithCode;
            if (err.code === 'ENOENT') {
                res.status(404).json({
                    code: 1,
                    msg: 'Translation file not found'
                });
            } else {
                logger.error('Failed to read translation file:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to load translation'
                });
            }
        }
    });

    app.post('/api/language', async (req: Request, res: Response) => {
        const { language } = req.body;
        
        if (!language || !globalSettings.availableLanguages?.includes(language)) {
            return res.status(400).json({
                code: 1,
                msg: 'Invalid language'
            });
        }
        
        globalSettings.language = language;
        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        
        res.json({
            code: 0,
            data: { language: globalSettings.language }
        });
    });

    app.get('/api/manual-group', (req: Request, res: Response) => {
        res.json({
            code: 0,
            data: {
                enabled: globalSettings.manualGroup?.enabled || false,
                members: globalSettings.manualGroup?.members || []
            }
        });
    });

    app.post('/api/manual-group/toggle', async (req: Request, res: Response) => {
        if (!globalSettings.manualGroup) {
            globalSettings.manualGroup = { enabled: false, members: [] };
        }
        
        globalSettings.manualGroup.enabled = !globalSettings.manualGroup.enabled;
        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        
        console.log(`Manual group ${globalSettings.manualGroup.enabled ? 'enabled' : 'disabled'}`);
        
        res.json({
            code: 0,
            data: {
                enabled: globalSettings.manualGroup.enabled,
                members: globalSettings.manualGroup.members
            }
        });
    });

    app.post('/api/manual-group/add', async (req: Request, res: Response) => {
        const { uid, name } = req.body;
        
        if (!uid) {
            return res.status(400).json({
                code: 1,
                msg: 'UID is required'
            });
        }
        
        if (!globalSettings.manualGroup) {
            globalSettings.manualGroup = { enabled: false, members: [] };
        }
        
        const exists = globalSettings.manualGroup.members.some(m => m.uid === uid);
        if (exists) {
            return res.status(400).json({
                code: 1,
                msg: 'Player already in group'
            });
        }
        
        globalSettings.manualGroup.members.push({ uid, name: name || 'Unknown' });
        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        
        console.log(`Added player ${name || uid} to manual group`);
        
        res.json({
            code: 0,
            data: {
                enabled: globalSettings.manualGroup.enabled,
                members: globalSettings.manualGroup.members
            }
        });
    });

    app.post('/api/manual-group/remove', async (req: Request, res: Response) => {
        const { uid } = req.body;
        
        if (!uid) {
            return res.status(400).json({
                code: 1,
                msg: 'UID is required'
            });
        }
        
        if (!globalSettings.manualGroup) {
            globalSettings.manualGroup = { enabled: false, members: [] };
        }
        
        globalSettings.manualGroup.members = globalSettings.manualGroup.members.filter(m => m.uid !== uid);
        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        
        console.log(`Removed player ${uid} from manual group`);
        
        res.json({
            code: 0,
            data: {
                enabled: globalSettings.manualGroup.enabled,
                members: globalSettings.manualGroup.members
            }
        });
    });

    app.post('/api/manual-group/clear', async (req: Request, res: Response) => {
        if (!globalSettings.manualGroup) {
            globalSettings.manualGroup = { enabled: false, members: [] };
        }
        
        globalSettings.manualGroup.members = [];
        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        
        console.log('Cleared manual group members');
        
        res.json({
            code: 0,
            data: {
                enabled: globalSettings.manualGroup.enabled,
                members: []
            }
        });
    });

    app.get('/api/player-registry', (req: Request, res: Response) => {
        if (!globalSettings.playerRegistry) {
            globalSettings.playerRegistry = {};
        }
        res.json({
            code: 0,
            data: globalSettings.playerRegistry
        });
    });

    app.post('/api/player-registry/save', async (req: Request, res: Response) => {
        const { uid, name } = req.body;
        
        if (!uid || !name) {
            return res.status(400).json({
                code: 1,
                msg: 'UID and name are required'
            });
        }

        if (!globalSettings.playerRegistry) {
            globalSettings.playerRegistry = {};
        }

        globalSettings.playerRegistry[uid] = { uid, name };
        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        
        console.log(`Saved player: ${uid} -> ${name}`);
        
        res.json({
            code: 0,
            data: globalSettings.playerRegistry
        });
    });

    app.post('/api/player-registry/delete', async (req: Request, res: Response) => {
        const { uid } = req.body;
        
        if (!uid) {
            return res.status(400).json({
                code: 1,
                msg: 'UID is required'
            });
        }

        if (!globalSettings.playerRegistry) {
            globalSettings.playerRegistry = {};
        }

        delete globalSettings.playerRegistry[uid];
        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        
        console.log(`Deleted player: ${uid}`);
        
        res.json({
            code: 0,
            data: globalSettings.playerRegistry
        });
    });

    app.post('/api/player-registry/auto-update', async (req: Request, res: Response) => {
        if (!globalSettings.playerRegistry) {
            globalSettings.playerRegistry = {};
        }

        const userData = userDataManager.getAllUsersData();
        let updated = false;

        for (const [uid, player] of Object.entries(userData)) {
            if (player.name && player.name !== 'Unknown' && player.name.trim() !== '') {
                const uidStr = String(uid);
                if (globalSettings.playerRegistry[uidStr] && globalSettings.playerRegistry[uidStr].name !== player.name) {
                    console.log(`Auto-updated player name: ${uid} from "${globalSettings.playerRegistry[uidStr].name}" to "${player.name}"`);
                    globalSettings.playerRegistry[uidStr].name = player.name;
                    updated = true;
                }
            }
        }

        if (updated) {
            await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        }

        res.json({
            code: 0,
            data: { updated, registry: globalSettings.playerRegistry }
        });
    });

    app.get('/api/diccionario', async (req: Request, res: Response) => {
        const diccionarioPath = path.join(__dirname, '..', '..', 'diccionario.json');
        try {
            const data = await fsPromises.readFile(diccionarioPath, 'utf8');
            if (data.trim() === '') {
                res.json({});
            } else {
                res.json(JSON.parse(data));
            }
        } catch (error) {
            const err = error as ErrorWithCode;
            if (err.code === 'ENOENT') {
                logger.warn('diccionario.json not found, returning empty object.');
                res.json({});
            } else {
                logger.error('Failed to read or parse diccionario.json:', error);
                res.status(500).json({ code: 1, msg: 'Failed to load diccionario', error: (error as Error).message });
            }
        }
    });

    io.on('connection', (socket) => {
        console.log('WebSocket client connected: ' + socket.id);

        socket.on('disconnect', () => {
            console.log('WebSocket client disconnected: ' + socket.id);
        });
    });

    setInterval(() => {
        if (!globalSettings.isPaused) {
            const userData = userDataManager.getAllUsersData();
            const data: ApiResponse = {
                code: 0,
                user: userData,
            };
            io.emit('data', data);
        }
    }, 100);
}

export default initializeApi;
