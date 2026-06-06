const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { Player } = require("discord-player");
const { DefaultExtractors } = require("@discord-player/extractor");
const YoutubeExtractor = require("./extractors/YouTubeExtractor");

// Use the system-installed ffmpeg (Homebrew) instead of the npm binary.
// ffmpeg-static bundles a ~70MB platform-specific binary; the Homebrew
// version is updated independently and shared across the system.
process.env.FFMPEG_PATH = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
client.config = require("./bot/config");
client.commands = new Collection();
client.colour = 0x17bebb;

async function init() {
  fs.readdirSync("./commands").forEach((dirs) => {
    const commands = fs
      .readdirSync(`./commands/${dirs}`)
      .filter((f) => f.endsWith(".js"));
    for (const file of commands) {
      const command = require(`./commands/${dirs}/${file}`);
      console.log(`Loading command ${file}`);
      client.commands.set(command.name.toLowerCase(), command);
    }
  });

  const events = fs.readdirSync("./events").filter((f) => f.endsWith(".js"));
  for (const file of events) {
    console.log(`Loading discord.js event ${file}`);
    const event = require(`./events/${file}`);
    client.on(file.split(".")[0], event.bind(null, client));
  }

  const player = new Player(client, { ffmpegPath: process.env.FFMPEG_PATH });
  await player.extractors.loadMulti(DefaultExtractors);

  // YouTube extractor: load cookies if available so SABR streaming can sign in.
  // Provide cookies via one of:
  //   1. YOUTUBE_COOKIE env var containing a Netscape-format cookies.txt string
  //   2. youtube.cookies.txt file in the project root
  // The custom extractor works without cookies using the ANDROID client for
  // streaming, but cookies can still help with edge cases.
  let ytCookie;
  let ytCookieSource = null;
  if (process.env.YOUTUBE_COOKIE) {
    ytCookie = process.env.YOUTUBE_COOKIE;
    ytCookieSource = "YOUTUBE_COOKIE env";
  } else {
    const cookieFile = path.resolve(__dirname, "youtube.cookies.txt");
    if (fs.existsSync(cookieFile)) {
      const stat = fs.statSync(cookieFile);
      const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
      ytCookie = fs.readFileSync(cookieFile, "utf8");
      ytCookieSource = `youtube.cookies.txt (${stat.size} bytes, ${ageDays.toFixed(1)}d old)`;
    }
  }

  if (ytCookie) {
    console.log(`YoutubeExtractor: cookies from ${ytCookieSource} (optional — extractor works without them via ANDROID progressive format)`);
  } else {
    console.log("YoutubeExtractor: no cookies — using ANDROID progressive format for unauthenticated streaming (no SABR / IP-binding issues).");
  }
  await player.extractors.register(YoutubeExtractor, { cookie: ytCookie });
  client.player = player;

  const playerFiles = fs.readdirSync("./player").filter((f) => f.endsWith(".js"));
  for (const file of playerFiles) {
    console.log(`Loading discord-player event ${file}`);
    const event = require(`./player/${file}`);
    player.events.on(file.split(".")[0], event.bind(null, client));
  }

  await client.login(client.config.discord.token);
}

init().catch((err) => {
  console.error("Failed to initialize:", err);
  process.exit(1);
});
