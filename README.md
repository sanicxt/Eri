# Eri

Eri is a powerful and simple Discord music bot built with [Discord.js](https://discord.js.org/) and backed by [Kazagumo](https://github.com/Kazagumo/Kazagumo) for high-performance audio handling via Lavalink.

## ✨ Features

- **High Quality Music**: Powered by Lavalink for lag-free music playback.
- **Multi-Platform Support**: Plays music from YouTube, Spotify, and more.
- **Slash Commands**: Modern discord interaction using slash commands.
- **Audio Filters**: Built-in support for audio filters (via `kazagumo-filter`).
- **Hybrid Sharding**: Scalable structure suitable for large bot deployments.

## 🚀 Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: v18 or higher.
- **Lavalink**: A running Lavalink server (v4.0+ recommended).
- **Discord Bot Token**: Get one from the [Discord Developer Portal](https://discord.com/developers/applications).
- **Spotify Credentials** (Optional): For Spotify support, get a Client ID and Secret from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications).

## 🛠️ Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Killerpac/Eri.git
    cd Eri
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## ⚙️ Configuration

1.  Create a `.env` file in the root directory.
2.  Add the following variables:

    ```env
    TOKEN=your_discord_bot_token
    COOKIE=your_youtube_cookie_if_needed
    SPOTIFY_CLIENT_ID=your_spotify_client_id
    SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
    ```

    > **Note:** `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are optional but required if you want to play Spotify links.

3.  **Lavalink Configuration**:
    The bot is currently configured to use a static Lavalink node in `eri.js`. You may need to update the `Nodes` array in `eri.js` if you are using your own local or private Lavalink server.

    ```js
    // eri.js
    const Nodes = [
      {
        name: 'Local Node',
        url: 'localhost',
        port: 2333,
        auth: 'youshallnotpass',
        secure: false
      },
    ]
    ```

## ▶️ Running the Bot

To start the bot, run:

```bash
npm start
```

## 📝 License

This project is licensed under the MIT License.
