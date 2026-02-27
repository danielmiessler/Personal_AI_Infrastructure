# HomeBridge Management Workflow

**Purpose:** Manage Homebridge for HomeKit integration with Ring, Hue, and other smart home devices

**When to use:** When working with Ring sensors, cameras, motion detection, Homebridge issues, or HomeKit automation

---

## Overview

Homebridge bridges non-HomeKit devices to Apple HomeKit:
- **Ring:** Cameras, doorbells, motion sensors, contact sensors
- **Philips Hue:** Smart lights
- **RatGdo:** Garage door control

---

## Configuration

Set these environment variables in `~/.env`:

```bash
# Homebridge server connection
HOMEBRIDGE_HOST=your-homebridge-server
HOMEBRIDGE_IP=x.x.x.x
HOMEBRIDGE_SSH_KEY=~/.ssh/your-key
HOMEBRIDGE_USER=your-username

# HomeKit
HOMEKIT_PAIRING_CODE=xxx-xx-xxx
```

## Quick Access

**Web UI:** `http://$HOMEBRIDGE_HOST:8581/`
**SSH:** `ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP`

---

## Common Tasks

### 1. Restart Homebridge (Force Discovery)

**When:** New Ring device added, device not appearing, troubleshooting

```bash
source ~/.env
ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP "pkill -f hb-service && sleep 5 && ps aux | grep homebridge"
```

**What happens:**
- Kills hb-service (parent process for both web UI and homebridge)
- LaunchDaemon auto-restarts within 5 seconds
- Homebridge rediscovers all Ring/Hue/RatGdo devices
- Check logs to verify devices discovered

### 2. Check Homebridge Status

```bash
source ~/.env
ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP "ps aux | grep -E 'homebridge|hb-service' | grep -v grep"
```

**Expected output:**
- `hb-service` process (manages web UI on port 8581)
- `homebridge` process (HomeKit bridge)

### 3. View Homebridge Logs

**Real-time logs:**
```bash
source ~/.env
ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP "tail -f ~/.homebridge/homebridge.log"
```

**Recent Ring device discovery:**
```bash
source ~/.env
ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP "grep 'Ring.*Configured' ~/.homebridge/homebridge.log | tail -20"
```

**Find motion sensors:**
```bash
source ~/.env
ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP "grep 'sensor\.' ~/.homebridge/homebridge.log | tail -10"
```

### 4. Add Device to HomeKit

**After Homebridge discovers a device:**

1. Open **Apple Home app** on iPhone/iPad/Mac
2. Tap **+ Add Accessory**
3. Tap **More Options...**
4. Find the device in the list
5. Tap the device
6. Enter pairing code from your config
7. Tap **Add to Home**
8. Choose room and name

### 5. Check Ring Plugin Configuration

**View config:**
```bash
source ~/.env
ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP "cat ~/.homebridge/config.json | grep -A 5 'Ring'"
```

**Edit config via web UI:**
- Go to `http://$HOMEBRIDGE_HOST:8581/`
- Click **Config** tab
- Find `"platform": "Ring"` section
- Edit options if needed
- Save and restart Homebridge

---

## Ring Plugin Options

The Ring plugin supports these config options:

```json
{
  "platform": "Ring",
  "refreshToken": "...",
  "hideDoorbellSwitch": false,
  "hideCameraSirenSwitch": false,
  "hideAlarmSirenSwitch": false,
  "hideLightGroups": false,
  "hideUnsupportedServices": false,
  "ffmpegPath": "/opt/homebrew/bin/ffmpeg"
}
```

**By default**, Ring plugin exposes:
- ✅ Cameras (all models)
- ✅ Doorbells
- ✅ Motion sensors
- ✅ Contact sensors
- ✅ Flood/freeze sensors
- ✅ Smoke/CO alarms
- ❌ Shadow adapters (hidden by default)

---

## Troubleshooting

### Device Not Appearing in HomeKit

**Symptom:** Ring device shows in logs but not in Home app

**Steps:**
1. Check Homebridge logs for "Adding new accessory" or "Configured" messages
2. Verify device type isn't hidden (e.g., shadow adapters are always hidden)
3. Restart Homebridge to force re-discovery
4. Check if device says "Please add manually in Home app"
5. Open Home app and look under "More Options" when adding accessory

### Motion Sensor Not Showing

**Symptom:** Ring motion sensor added to Ring app, but not in HomeKit

**Common causes:**
- Homebridge hasn't restarted since sensor was added to Ring
- Sensor is in logs but not exposed as accessory
- Plugin configuration hiding sensors

**Fix:**
1. Restart Homebridge (see section 1)
2. Check logs: `grep 'sensor.motion' ~/.homebridge/homebridge.log`
3. Look for "Adding new accessory" with sensor name
4. If found, add manually in Home app with your pairing code
5. If NOT found, check Ring plugin config for `hideUnsupportedServices`

### Multiple Homebridge Processes Running

**Symptom:** `ps aux | grep homebridge` shows duplicate processes

**Fix:**
```bash
source ~/.env
ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP "pkill -f homebridge && pkill -f hb-service && sleep 5 && ps aux | grep homebridge"
```

LaunchDaemon will restart cleanly.

### Web UI Not Accessible

**Symptom:** Web UI returns error

**Check:**
1. Is hb-service running? `ps aux | grep hb-service`
2. Is port 8581 listening? `lsof -i :8581`
3. Restart: `pkill hb-service` (auto-restarts)

---

## Workflow Steps

### Adding a New Ring Device

1. **Add device to Ring app first**
   - Use Ring mobile app
   - Complete setup and naming
   - Verify device online in Ring app

2. **Restart Homebridge**
   ```bash
   source ~/.env
   ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP "pkill -f hb-service"
   ```

3. **Check discovery logs**
   ```bash
   source ~/.env
   ssh -i $HOMEBRIDGE_SSH_KEY $HOMEBRIDGE_USER@$HOMEBRIDGE_IP "tail -50 ~/.homebridge/homebridge.log | grep 'Ring.*Configured\|Ring.*Adding'"
   ```

4. **Add to HomeKit**
   - Open Home app
   - Tap + Add Accessory → More Options
   - Find device in list
   - Enter your pairing code

5. **Verify in Home app**
   - Device appears in chosen room
   - Test functionality (motion, camera, etc.)
   - Create automations if needed

---

## LaunchDaemon Configuration

**Management:**
- Auto-starts on boot
- Auto-restarts on crash

**Manual operations:**
```bash
# Stop (will auto-restart)
sudo launchctl bootout system/com.homebridge.server

# Start (if stopped)
sudo launchctl bootstrap system /Library/LaunchDaemons/com.homebridge.server.plist

# Disable auto-start (not recommended)
sudo launchctl disable system/com.homebridge.server
```

---

## Integration Notes

**Ring Plugin Details:**
- Package: `homebridge-ring`
- Installed via: Homebridge web UI or `npm install -g homebridge-ring`
- Requires: Ring refresh token (stored in config.json)

**Authentication:**
- Uses Ring refresh token (OAuth-based)
- Token stored in `~/.homebridge/config.json`
- Token auto-refreshes (no manual renewal needed)
- If auth fails, re-run: `npx -p ring-client-api ring-auth-cli`
