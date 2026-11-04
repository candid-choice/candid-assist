# Slack app setup for pi-dev-stack

1. **Create app** — [api.slack.com/apps](https://api.slack.com/apps) → From scratch → your workspace.
2. **Socket Mode** — enable.
3. **App-Level Tokens** (Basic Information → Generate Token and Scopes) —
   scope `connections:write`; save the `xapp-…` token.
4. **OAuth & Permissions** — Bot Token Scopes: `chat:write`,
   `channels:history`, `groups:history` (+ `im:history`, `mpim:history`,
   `app_mention` as needed). Install to workspace; save `xoxb-…`.
5. **Event Subscriptions** — enable; bot events: `message.channels`,
   `message.groups` (bot-authored messages are filtered in the bridge).
6. **Invite the bot** — `/invite @YourBot` in the private channel.
7. **Repo .env** (never committed):
   `SLACK_BOT_TOKEN=xoxb-…`, `SLACK_APP_TOKEN=xapp-…`,
   `SLACK_CHANNEL=C0123456789` (channel ID, not name).
8. Reference in `.pi/dev-stack.json` under `slack` via `env:SLACK_BOT_TOKEN`
   etc., then `/reload` pi. `/dev-stack` shows `slack: connected → #…`.
