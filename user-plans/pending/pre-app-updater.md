# Electron App Updater (Sparkle) Plan

## Overview

Defines how Human Assist handles automatic updates using Sparkle for macOS. This complements the CI/CD and launch checklist plans.

## Update Flow

```
[App Launch]
    → Check for update (Sparkle background task)
        → Update available?
            → Download silently in background
                → Download complete?
                    → Show update prompt on next restart
                        → User chooses
                            → "Restart Now" → Install and restart
                            → "Later" → Skip, remind next time
```

## Sparkle Configuration

| Property | Value |
|----------|-------|
| Framework | Sparkle 2.x |
| Feed URL | https://humanassist.dev/sparkle/feed.xml |
| Auto Update | Enabled (download in background) |
| Update Prompt | Enabled (notify on new version) |
| Installation Alert | Enabled (notify on install failure) |
| Synchronization Enabled | True (multiple instances) |
| Auto Download Updates | True |

## Update Prompt

```
┌────────────────────────────────────────────────────────────────────────┐
│  A new version of Human Assist is available!                          │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  Version 1.1.0 is now available.                                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Release Notes:                                                  │  │
│  │  - New: Task Composer with file attachments                      │  │
│  │  - Fixed: Surface timeout on browser navigation                   │  │
│  │  - Improved: Faster surface rendering                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [ Download & Install ]    [ Skip ]    [ Remind Me Later ]            │
└────────────────────────────────────────────────────────────────────────┘
```

## Update States

| State | Behavior |
|-------|----------|
| Checking | No UI change, log update check to Sentry |
| Downloading | Show download progress in status bar |
| Downloading Complete | Save file, wait for user action |
| Ready to Install | Show update prompt on next app restart |
| Install Failed | Show error, retry in 1 hour |
| Already Up to Date | No action |

## Status Bar Progress

| State | Display |
|-------|---------|
| Checking | "Checking for updates..." |
| Downloading | "Downloading update... 45%" |
| Ready | "Update ready — restart to install" |

## Update Permissions

| Setting | Default | Description |
|---------|---------|-------------|
| Auto update enabled | true | Sparkle checks for updates on launch |
| Notify on update | true | Show update prompt |
| Background download | true | Download updates silently |
| Update schedule | Every 6 hours | Check for updates |
| First launch check | 1 minute | First check happens 1 minute after first launch |

## Update Channels

| Channel | Source | Target |
|---------|--------|--------|
| Release | GitHub Releases | All users |
| Beta | GitHub Releases (beta tag) | Beta testers only |

## Beta Updates

For beta testing:
1. Build with version 2.0.0-beta.1
2. Publish to GitHub Releases with "beta" tag
3. App checks beta feed URL for updates
4. Beta users get early access to new features
5. Stable users only get release channel updates

## Update Testing

| Scenario | Steps | Expected |
|----------|-------|----------|
| No update available | Launch app | No prompt shown |
| Update available | Launch app | Prompt shown after download |
| Update skipped | Click "Skip" | Prompt gone, remind tomorrow |
| Update cancelled | Close prompt | No download started |
| Download fails | Network error | Error message, retry later |
| Install fails | Permissions error | Error message, try again |
| App not running | Update ready, app closed | Install on next launch |
| App running | Update ready, app open | Install on restart |

## Security

| Concern | Mitigation |
|---------|------------|
| Update spoofing | Sparkle uses code signing (Apple Developer ID) |
| MITM attacks | HTTPS + signature verification |
| Supply chain attack | GitHub-hosted feed, not self-hosted |
| Brute force | Rate limit update requests (10/hour) |

## Rollback Strategy

| Scenario | Action |
|----------|--------|
| Update breaks app | Disable auto-update, fix, re-release |
| User reports bug | Manual download of previous version |
| Security issue | Emergency update, force prompt |
