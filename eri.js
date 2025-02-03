const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { Connectors, NodeManager } = require("shoukaku");
const { Kazagumo } = require("kazagumo");
const KazagumoFilter = require('kazagumo-filter');
const Spotify = require('kazagumo-spotify');
const fs = require('fs');
const axios = require('axios');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
    ] 
});

client.config = require("./bot/config");
client.commands = new Collection();
client.colour = 0x17BEBB;

// Fallback nodes in case API fails
const fallbackNodes = [{
    name: 'Catfein DE',
    url: 'lavalink.alri.id',
    port: 443,
    auth: 'catfein',
    secure: true
}];

async function testNode(node, timeout = 5000) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(`https://${node.url}:${node.port}/version`, {
            headers: { Authorization: node.auth },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}

const isV4Node = (node) => node.restVersion?.startsWith('v4') || node.version?.startsWith('4');

async function fetchNodes() {
    try {
        const response = await axios.get('https://lavalinks-list.vercel.app/api/ssl');
        if (!response.data || !Array.isArray(response.data)) {
            throw new Error('Invalid API response');
        }

        // Filter v4 nodes first
        const v4Nodes = response.data
            .filter(isV4Node)
            .map(node => ({
                name: node.identifier || 'Unknown',
                url: node.host,
                port: node.port,
                auth: node.password,
                secure: true,
                version: node.version || node.restVersion
            }));

        if (v4Nodes.length === 0) {
            console.log('No v4 nodes found, using fallback nodes');
            return fallbackNodes;
        }

        // Test filtered nodes
        const nodeTests = await Promise.all(
            v4Nodes.map(async (node) => ({
                node,
                isOnline: await testNode(node)
            }))
        );

        const workingNodes = nodeTests
            .filter(({ isOnline }) => isOnline)
            .map(({ node }) => node);

        console.log(`Found ${workingNodes.length} working v4 nodes out of ${v4Nodes.length}`);
        
        return workingNodes.length > 0 ? workingNodes : fallbackNodes;
    } catch (error) {
        console.error('Failed to fetch Lavalink nodes:', error);
        return fallbackNodes;
    }
}

async function initializeClient() {
    const nodes = await fetchNodes();
    console.log(`Loaded ${nodes.length} Lavalink nodes`);

    client.player = new Kazagumo({
        plugins: [
            new KazagumoFilter(),
            new Spotify({
                clientId: client.config.discord.spotify_client_id,
                clientSecret: client.config.discord.spotify_client_secret,
                playlistPageLimit: 1,
                albumPageLimit: 1,
                searchLimit: 10,
            })
        ],
        defaultSearchEngine: "youtube-music",
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        }
    }, new Connectors.DiscordJS(client), nodes);

    // Load commands
    fs.readdirSync('./commands').forEach(dirs => {
        const commands = fs.readdirSync(`./commands/${dirs}`).filter(files => files.endsWith('.js'));
        for (const file of commands) {
            const command = require(`./commands/${dirs}/${file}`);
            console.log(`Loading command ${file}`);
            client.commands.set(command.name.toLowerCase(), command);
        }
    });

    // Load events
    const events = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    const player = fs.readdirSync('./player').filter(file => file.endsWith('.js'));

    for (const file of events) {
        console.log(`Loading discord.js event ${file}`);
        const event = require(`./events/${file}`);
        client.on(file.split(".")[0], event.bind(null, client));
    }

    for (const file of player) {
        console.log(`Loading Kazagumo event ${file}`);
        const event = require(`./player/${file}`);
        client.player.on(file.split(".")[0], event.bind(null, client));
    }

    await client.login(client.config.discord.token);
}

initializeClient().catch(console.error);