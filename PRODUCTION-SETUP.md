# Production File Locations Setup

## Overview
This document explains how user data (settings and logs) are stored in development vs production environments.

## Implementation

### Environment Detection
The application now detects whether it's running in development or production mode and stores user data accordingly:

- **Development**: Files are stored in the project directory for easy access during development
- **Production**: Files are stored in the OS-specific user data directory following platform conventions

### File Paths

#### Development Mode
```
project-root/
├── settings.json          # User settings
└── logs/                  # Combat history logs
    └── {timestamp}/
        ├── summary.json
        ├── allUserData.json
        ├── fight.log
        └── users/
            └── {uid}.json
```

#### Production Mode (Windows)
```
%APPDATA%\bpsr-meter\
├── settings.json          # User settings
└── logs/                  # Combat history logs
    └── {timestamp}/
        ├── summary.json
        ├── allUserData.json
        ├── fight.log
        └── users/
            └── {uid}.json
```

Example: `C:\Users\YourName\AppData\Roaming\bpsr-meter\`

#### Production Mode (Linux)
```
~/.config/bpsr-meter/
├── settings.json
└── logs/
```

#### Production Mode (macOS)
```
~/Library/Application Support/bpsr-meter/
├── settings.json
└── logs/
```

## Code Changes

### 1. Main Process (`electron-main.ts`)
- Passes `USER_DATA_PATH` environment variable to the server process
- Uses `app.getPath('userData')` to get the platform-specific path
- Example: `process.env.USER_DATA_PATH = "C:\Users\YourName\AppData\Roaming\bpsr-meter"`

### 2. API Server (`src/server/api.ts`)
```typescript
const USER_DATA_DIR = process.env.USER_DATA_PATH || process.cwd();
const SETTINGS_PATH = path.join(USER_DATA_DIR, 'settings.json');
```

All history API endpoints now use `USER_DATA_DIR`:
- `/api/history/:timestamp/summary` → `{USER_DATA_DIR}/logs/{timestamp}/summary.json`
- `/api/history/:timestamp/data` → `{USER_DATA_DIR}/logs/{timestamp}/allUserData.json`
- `/api/history/:timestamp/skill/:uid` → `{USER_DATA_DIR}/logs/{timestamp}/users/{uid}.json`
- `/api/history/:timestamp/download` → `{USER_DATA_DIR}/logs/{timestamp}/fight.log`
- `/api/history/list` → `{USER_DATA_DIR}/logs/`

### 3. Data Manager (`src/server/dataManager.ts`)
```typescript
const USER_DATA_DIR = process.env.USER_DATA_PATH || process.cwd();
```

All log operations now use `USER_DATA_DIR`:
- `addLog()` → `{USER_DATA_DIR}/logs/{timestamp}/fight.log`
- `saveAllUserData()` → `{USER_DATA_DIR}/logs/{timestamp}/`

## Benefits

### For Users
1. **Clean Installation**: Settings and logs don't clutter the installation directory
2. **Persistent Data**: Settings survive application updates
3. **Easy Backup**: Know exactly where to find your data
4. **Multi-User Support**: Each OS user has their own settings
5. **Follows Platform Conventions**: Uses standard paths for each OS

### For Developers
1. **Development Convenience**: Files stay in project directory during development
2. **No Migration Needed**: Existing development setups continue to work
3. **Automatic Detection**: No manual configuration needed
4. **Platform Agnostic**: Works on Windows, Linux, and macOS

## Migration

### For Existing Installs
When updating to this version, users can:

1. **Keep Development Setup**: No changes needed if running from source
2. **Move Settings to Production Path**: 
   - Copy `settings.json` from project root to `%APPDATA%\bpsr-meter\`
   - Copy `logs/` folder to `%APPDATA%\bpsr-meter\logs\`

### Automatic Migration Script (Future Enhancement)
Consider adding a migration script that:
1. Detects old settings in project directory
2. Copies them to the new location on first run
3. Notifies user of the migration

## Testing

### Test Production Paths in Development
To test production path behavior without packaging:

1. Set environment variable:
   ```bash
   set USER_DATA_PATH=C:\Users\YourName\AppData\Roaming\bpsr-meter-test
   npm start
   ```

2. Verify files are created in the test directory

3. Check that all features work:
   - Settings save/load
   - History logging
   - History viewing

### Test Packaged Application
1. Build the application: `npm run build`
2. Package it: `npm run dist`
3. Install and run the packaged app
4. Verify files are in `%APPDATA%\bpsr-meter\`

## Troubleshooting

### Settings Not Persisting
- Check that `USER_DATA_PATH` is being set correctly in electron-main.ts
- Verify the directory has write permissions
- Check console for file system errors

### History Not Loading
- Ensure logs are being saved to the correct directory
- Check that API endpoints are using `USER_DATA_DIR`
- Verify the logs folder exists and has correct permissions

### Finding Your Data
Run this in the app's console (F12):
```javascript
console.log('Settings path:', process.env.USER_DATA_PATH || process.cwd());
```

Or check the OS-specific location:
- Windows: Open `%APPDATA%` in File Explorer
- Linux: `cd ~/.config/bpsr-meter`
- macOS: `open ~/Library/Application\ Support/bpsr-meter`
