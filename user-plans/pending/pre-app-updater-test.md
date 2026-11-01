# pre-app-updater — Test Specification

## Purpose

Verify the Electron app updater (Sparkle) plan correctly describes automatic update behavior.

## Unit Tests

### Update Flow
- [ ] Verify check for update happens on app launch
- [ ] Verify update download happens silently in background
- [ ] Verify download complete triggers update prompt on next restart
- [ ] Verify update prompt shows: version, release notes, download button, skip button

### Sparkle Configuration
- [ ] Verify feed URL is configured
- [ ] Verify auto update enabled
- [ ] Verify notify on update enabled
- [ ] Verify background download enabled
- [ ] Verify update schedule: every 6 hours
- [ ] Verify first launch check: 1 minute after first launch

### Update States
- [ ] Verify checking state: no UI change, log to Sentry
- [ ] Verify downloading state: show download progress in status bar
- [ ] Verify download complete: save file, wait for user action
- [ ] Verify install failed: error message, retry in 1 hour
- [ ] Verify already up to date: no action

### Status Bar Progress
- [ ] Verify "Checking for updates..." shown during check
- [ ] Verify "Downloading update... 45%" shown during download
- [ ] Verify "Update ready — restart to install" shown when ready

### Update Channels
- [ ] Verify release channel targets all users
- [ ] Verify beta channel targets beta testers only
- [ ] Verify beta builds have version like 2.0.0-beta.1
- [ ] Verify beta users get early access to new features

### Update Testing
- [ ] Verify "no update available" scenario: launch app, no prompt shown
- [ ] Verify "update available" scenario: launch app, prompt shown after download
- [ ] Verify "update skipped" scenario: click skip, prompt gone, remind tomorrow
- [ ] Verify "download fails" scenario: network error, error message, retry later
- [ ] Verify "install fails" scenario: permissions error, error message, try again
- [ ] Verify "app not running" scenario: update ready, app closed, install on next launch
- [ ] Verify "app running" scenario: update ready, app open, install on restart

### Security
- [ ] Verify Sparkle uses code signing (Apple Developer ID)
- [ ] Verify HTTPS + signature verification
- [ ] Verify GitHub-hosted feed (not self-hosted)
- [ ] Verify rate limit update requests (10/hour)

### Rollback Strategy
- [ ] Verify update breaks app: disable auto-update, fix, re-release
- [ ] Verify user reports bug: manual download of previous version
- [ ] Verify security issue: emergency update, force prompt

## Implementation Checklist

Before considering this plan "complete":
1. [ ] Update flow is described
2. [ ] Sparkle configuration is complete
3. [ ] All update states are described
4. [ ] All status bar behaviors are described
5. [ ] Update channels are described
6. [ ] All test scenarios are covered
7. [ ] Security measures are described
8. [ ] Rollback strategy is described
9. [ ] All error states are covered
