const { Client, Collection, Intents , GatewayIntentBits} = require("discord.js");
const fs = require('fs');
const {Connectors} = require("shoukaku");
const  {Kazagumo} = require("kazagumo");
const KazagumoFilter = require('kazagumo-filter');
const Spotify = require('kazagumo-spotify');
const client = new Client({ intents: [ GatewayIntentBits.Guilds ,GatewayIntentBits.GuildMessages,GatewayIntentBits.GuildVoiceStates] });
client.config = require("./bot/config")
client.commands = new Collection();
client.colour = 0x17BEBB;

// Static Lavalink node list (using the server you specified)
const Nodes = [
  {
    name: 'Catfein DE',
    url: 'public.rive.wtf',
    port: 443,
    auth: 'youshallnotpass',
    secure: true
  },
];

async function initPlayerAndLogin() {
    // Load commands and events that don't depend on the player
    fs.readdirSync('./commands').forEach(dirs => {
        const commands = fs.readdirSync(`./commands/${dirs}`).filter(files => files.endsWith('.js'));

        for (const file of commands) {
            const command = require(`./commands/${dirs}/${file}`);
            console.log(`Loading command ${file}`);
            client.commands.set(command.name.toLowerCase(), command);
        };
    });

    const events = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    for (const file of events) {
        console.log(`Loading discord.js event ${file}`);
        const event = require(`./events/${file}`);
        client.on(file.split(".")[0], event.bind(null, client));
    };


const Nodes = [
  {
    name: 'Catfein DE',
    url: 'public.rive.wtf',
    port: 443,
    auth: 'youshallnotpass',
    secure: true
  },
]

    client.player =  new Kazagumo({
        plugins: [
            new KazagumoFilter(),
            new Spotify({
                clientId: client.config.discord.spotify_client_id,
                clientSecret: client.config.discord.spotify_client_secret,
                playlistPageLimit: 1, // optional ( 100 tracks per page )
                albumPageLimit: 1, // optional ( 50 tracks per page )
                searchLimit: 10, // optional ( track search limit. Max 50 )
              })
          ],
        defaultSearchEngine: "youtube-music",
        // MAKE SURE YOU HAVE THIS
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

