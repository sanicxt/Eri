const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require('fs');
// Use Connectors exported by kazagumo (not shoukaku) for compatibility
const { Kazagumo,Plugins } = require("kazagumo");
const {Connectors} = require("shoukaku");
const KazagumoFilter = require('kazagumo-filter');
const Spotify = require('kazagumo-spotify');
const client = new Client({ intents: [ GatewayIntentBits.Guilds ,GatewayIntentBits.GuildMessages,GatewayIntentBits.GuildVoiceStates] });
client.config = require("./bot/config")
client.commands = new Collection();
client.colour = 0x17BEBB;

// Static Lavalink node list (using the server you specified)
const Nodes = [
  {
    name: 'Jirayu',
    url: 'lavalink.jirayu.net',
    port: 443,
    auth: 'youshallnotpass',
    secure: true
  },
]

async function initPlayerAndLogin() {
    // Load commands and events that don't depend on the player
    fs.readdirSync('./commands').forEach(dirs => {
        const commands = fs.readdirSync(`./commands/${dirs}`).filter(files => files.endsWith('.js'));

        for (const file of commands) {
            try {
                const command = require(`./commands/${dirs}/${file}`);
                console.log(`Loading command ${file}`);
                if (command && command.name) client.commands.set(command.name.toLowerCase(), command);
            } catch (err) {
                console.error(`Failed to load command ${file}:`, err);
            }
        }
    });

    const events = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    for (const file of events) {
        try {
            console.log(`Loading discord.js event ${file}`);
            const event = require(`./events/${file}`);
            if (typeof event === 'function') client.on(file.split(".")[0], event.bind(null, client));
        } catch (err) {
            console.error(`Failed to load event ${file}:`, err);
        }
    }

    // Build plugin list dynamically: only include Spotify plugin if credentials are provided
    const plugins = [new KazagumoFilter(), new Plugins.PlayerMoved(client)];
    if (client.config.discord.spotify_client_id && client.config.discord.spotify_client_secret) {
        plugins.push(new Spotify({
            clientId: client.config.discord.spotify_client_id,
            clientSecret: client.config.discord.spotify_client_secret,
            playlistPageLimit: 1,
            albumPageLimit: 1,
            searchLimit: 10
        }));
    } else {
        console.warn('Spotify credentials not found, Spotify plugin will be disabled.');
    }

    client.player = new Kazagumo({
        plugins,
        defaultSearchEngine: "youtube-music",
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        }
    }, new Connectors.DiscordJS(client), Nodes);

    // Load Kazagumo player event handlers now that client.player exists
    const playerFiles = fs.readdirSync('./player').filter(file => file.endsWith('.js'));
    for (const file of playerFiles) {
        console.log(`Loading Kazagumo event ${file}`);
        const event = require(`./player/${file}`);
        client.player.on(file.split(".")[0], event.bind(null, client));
    }

    // Optional: log node status
    try {
        client.player.on('NODE_CONNECT', node => console.log(`Kazagumo: node connected ${node.name}`));
        client.player.on('NODE_DISCONNECT', node => console.warn(`Kazagumo: node disconnected ${node.name}`));
    } catch (err) {
        // Some versions may not emit these events
    }

    // No periodic node refresh configured — using the static node list as-is
    let currentNodes = Nodes;
    const nodeKey = n => `${n.url}:${n.port}:${n.auth}:${n.secure}`;

    client.login(client.config.discord.token);
}

initPlayerAndLogin().catch(err => {
    console.error('Failed to initialize player and login:', err);
    process.exit(1);
});

