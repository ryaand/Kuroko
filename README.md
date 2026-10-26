<div align="center">

# 黒子 - Kuroko

**An unofficial Discord bot for tracking your daily progress in Idle Miner.**

<p>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 20+"></a>
  <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white" alt="discord.js v14"></a>
  <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB-required-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License"></a>
</p>

<p>
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting started</a> •
  <a href="#commands">Commands</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#contributing">Contributing</a>
</p>

</div>

---

## Overview

Kuroko is an unofficial Discord bot that automatically records your
daily rebirth and prestige progress from Idle Miner. It stores daily gains in
MongoDB and provides a visual graph for the most recent 14 days.

The bot is designed to stay out of the way: play Idle Miner normally, let the bot
observe the relevant result messages, and use `/graph` whenever you want to review
your progress.

> **Disclaimer:** This is an unofficial community project. It is not affiliated with,
> endorsed by, or sponsored by the developers of Idle Miner or Discord.

## Preview

![Graph preview](assets/graph-preview.png)

The generated graph includes:

- Rebirth and Prestige values for the last 14 days.
- Daily labels adjusted to the user's configured GMT offset.
- A username and timezone header inside the image.
- A stacked bar chart for daily progress.
- Highest daily Rebirth and Prestige totals in the Discord response.

## Features

- **Automatic progress tracking**  
  Reads Idle Miner result embeds and records daily Rebirth and Prestige gains.

- **14-day progress graph**  
  `/graph` generates a readable chart using the latest two weeks of stored data.

- **Timezone-aware daily records**  
  Configure a GMT offset so a daily gain is assigned to the correct local date.

- **User-specific graphs**  
  View your own graph or select another user with the optional `target` argument.

- **Persistent MongoDB storage**  
  User records, timezone settings, daily totals, and message references are stored
  in MongoDB.

- **Reset controls**  
  `/reset` uses a confirmation prompt before permanently deleting a user's tracking data.

- **Modular command structure**  
  Each slash command is maintained in its own file, making future changes easier.

## Commands

| Command | Description |
| --- | --- |
| `/graph` | Generate your 14-day Rebirth and Prestige graph. |
| `/graph target:<user>` | View another user's graph, when their data is available. |
| `/set theme value:<dark\|light>` | Choose the graph theme. |
| `/set color chart category:<rebirth\|prestige> value:<hex>` | Set one custom chart color. |
| `/set timezone gmt:<offset>` | Set your timezone from GMT-12 to GMT+14. Quarter-hour offsets are supported. |
| `/help` | Display the command list and usage guide. |
| `/reset` | Permanently delete your stored tracking data after confirmation. |

### Timezone examples

```text
/set timezone gmt: 7
/set timezone gmt: -5
/set timezone gmt: 5.5
```

The accepted range is **GMT-12 through GMT+14**. Values are rounded to the nearest
quarter hour.

### Graph appearance settings

Use `/set` to customize the graph for each user:

```text
/set theme value: dark
/set color chart category: rebirth value: #2ECC71
/set color chart category: prestige value: #F1C40F
/set timezone gmt: 7
```

The theme command provides only `dark` and `light`. Chart colors are entered
manually as six-digit hexadecimal values beginning with `#`. If Rebirth and
Prestige are set to the same color, the bot displays a dismissible warning because
the two chart sections may be difficult to distinguish.

## Getting started

### Prerequisites

Before running the bot, install or create:

- [Node.js](https://nodejs.org/) 20 or newer.
- A Discord application and bot account.
- A MongoDB database, either local or hosted.
- Access to the Idle Miner messages that the bot needs to observe.

### 1. Clone the repository

```bash
git clone https://github.com/ryaand/Kuroko.git
cd Rebirth-Weekly-Counter
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an application and open its **Bot** page.
3. Copy the bot token.
4. Enable the privileged **Message Content Intent**.
5. Invite the bot to a server where it can read the relevant Idle Miner messages.

The bot uses the following Discord gateway intents:

- Guilds
- Guild Messages
- Message Content
- Guild Members

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
BOT_TOKEN=your_discord_bot_token
MONGO_URI=mongodb+srv://username:password@cluster.example.mongodb.net/kuroko
PORT=3000
```

Do not commit `.env` or share your bot token. The repository already ignores `.env`
through `.gitignore`.

### 5. Start the bot

Use the modular entry point:

```bash
node main.js
```

Or use the npm script:

```bash
npm start
```

When startup succeeds, the process reports the web server and database connection
status in the console.

## Configuration

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `BOT_TOKEN` | Yes | Discord bot token from the Developer Portal. |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `PORT` | No | HTTP health-check port. Defaults to `3000`. |

### Graph layout

Graph rendering is isolated in [`services/graphRenderer.js`](services/graphRenderer.js).
The layout constants near the renderer's chart setup control the spacing between:

- Username and timezone.
- Timezone and legend.
- Legend and chart.
- The upper chart content and the canvas boundary.

The left and right axis margins are calculated automatically from the widest tick
label, so larger values such as thousands remain visible without being clipped.

This keeps visual adjustments independent from command handling and database logic.

## Project structure

```text
.
├── commands/
│   ├── graph.js          # /graph command
│   ├── help.js           # /help command
│   ├── reset.js          # /reset command
│   ├── setCommand.js     # /set command registration
│   ├── setColorChart.js  # /set color chart
│   ├── setTheme.js       # /set theme
│   └── setTimezone.js    # /set timezone
├── services/
│   ├── graphRenderer.js  # Canvas graph generation
│   └── idleMinerTracker.js
│                         # Idle Miner message parsing and daily storage
├── assets/
│   └── graph-preview.png # README preview image
├── main.js               # Application entry point and command loader
├── models.js             # Mongoose models
├── package.json
├── LICENSE
└── README.md
```

### Architecture

`main.js` is intentionally kept as the application bootstrap layer. It creates the
Discord client, connects the database, registers slash commands, and dispatches
interactions to the matching module in `commands/`.

The command modules contain user-facing command behavior. Shared operational logic
belongs in `services/`, while MongoDB schemas are kept in `models.js`. This separation
makes it possible to adjust the graph without changing `/help` or tracking behavior.

## Data and privacy

The bot stores the following information for tracking purposes:

- Discord user ID.
- Daily date.
- Rebirth and Prestige gains.
- References to the latest source message and channel.
- User timezone offset.

The bot does not need your Discord password or any payment information. Server
administrators should review their own retention requirements and secure the MongoDB
instance used by the deployment.

## Development

Run syntax checks before opening a pull request:

```bash
node --check main.js
```

To check every project JavaScript file on PowerShell:

```powershell
Get-ChildItem -Path . -Recurse -File -Filter *.js |
  Where-Object { $_.FullName -notlike '*\node_modules\*' } |
  ForEach-Object { node --check $_.FullName }
```

When changing graph layout, verify both the generated image and the Discord response.
When changing data handling, test first-time records, existing daily records, timezone
boundaries, missing data, and reset confirmation behavior.

## Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a focused branch:

   ```bash
   git checkout -b fix/describe-your-change
   ```

3. Make the smallest complete change that solves the problem.
4. Run the syntax checks and test the affected command.
5. Open a pull request with:
   - A clear summary.
   - Screenshots for graph or UI changes.
   - Any required environment or migration notes.

Please do not commit secrets, `.env` files, database credentials, or generated
dependency folders.

## License

This project is distributed under the MIT License. See [`LICENSE`](LICENSE) for the
full license text.

## Acknowledgements

- [Discord.js](https://discord.js.org/) for the Discord API library.
- [MongoDB](https://www.mongodb.com/) and [Mongoose](https://mongoosejs.com/) for
  persistent storage.
- [node-canvas](https://github.com/Automattic/node-canvas) for graph rendering.
- The Idle Miner community for the inspiration and feedback.

---

<div align="center">

La Piece.

</div>
