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
const Nodes = [
  {
    name: 'Catfein DE',
    url: 'lava-v4.ajieblogs.eu.org',
    port: 443,
    auth: 'https://dsc.gg/ajidevserver',
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
    }, new Connectors.DiscordJS(client),Nodes);
    
    fs.readdirSync('./commands').forEach(dirs => {
        const commands = fs.readdirSync(`./commands/${dirs}`).filter(files => files.endsWith('.js'));
    
        for (const file of commands) {
            const command = require(`./commands/${dirs}/${file}`);
            console.log(`Loading command ${file}`);
            client.commands.set(command.name.toLowerCase(), command);
        };
    });
    
    const events = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    const player = fs.readdirSync('./player').filter(file => file.endsWith('.js'));
    
    for (const file of events) {
        console.log(`Loading discord.js event ${file}`);
        const event = require(`./events/${file}`);
        client.on(file.split(".")[0], event.bind(null, client));
    };
    
    for (const file of player) {
        console.log(`Loading Kazagumo event ${file}`);
        const event = require(`./player/${file}`);
        client.player.on(file.split(".")[0], event.bind(null, client));
    }
    
    client.login(client.config.discord.token)

