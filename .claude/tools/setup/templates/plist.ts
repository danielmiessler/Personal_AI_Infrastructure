/**
 * macOS LaunchAgent plist template for voice server
 */

export const plistTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pai.voiceserver</string>

    <key>ProgramArguments</key>
    <array>
        <string>{{{bunPath}}}</string>
        <string>run</string>
        <string>{{{paiDir}}}/voice-server/server.ts</string>
    </array>

    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>{{{homeDir}}}</string>
        <key>PATH</key>
        <string>{{{homeDir}}}/.bun/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>PAI_DIR</key>
        <string>{{{paiDir}}}</string>
        <key>PORT</key>
        <string>{{voicePort}}</string>
    </dict>

    <key>WorkingDirectory</key>
    <string>{{{paiDir}}}/voice-server</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>{{{paiDir}}}/voice-server/logs/voice-server.log</string>

    <key>StandardErrorPath</key>
    <string>{{{paiDir}}}/voice-server/logs/voice-server-error.log</string>

    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>`;
