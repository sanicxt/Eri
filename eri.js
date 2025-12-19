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
const axios = require('axios');

const SSL_API = 'https://lavalink-list.ajieblogs.eu.org/SSL';
const NONSSL_API = 'https://lavalink-list.ajieblogs.eu.org/NonSSL';

/**
 * Fetch and normalize Lavalink node info from the provided APIs.
 * The API is expected to return an array of node objects; this function
 * will try multiple common field names and fall back sensibly.
 */
async function fetchNodesFromApis() {
    const sources = [
        { url: SSL_API, enforceSecure: true },
        { url: NONSSL_API, enforceSecure: false }
    ];

    const nodes = [];

    for (const src of sources) {
        try {
            const res = await axios.get(src.url, { timeout: 10_000 });
            const data = res.data;
            const list = Array.isArray(data) ? data : (Array.isArray(data.servers) ? data.servers : []);

            for (const item of list) {
                // Normalize possible field names
                const host = item.host || item.url || item.address || item.ip || item.hostname;
                const port = item.port || item.p || 80;
                const password = item.password || item.auth || item.pass || item.secret || item.token;
                const secureField = typeof item.secure === 'boolean' ? item.secure : src.enforceSecure;
                const name = item.name || item.id || `${host}:${port}`;

                if (!host || !password) continue; // skip invalid entries

                nodes.push({
                    name,
                    url: host,
                    port: Number(port),
                    auth: String(password),
                    secure: Boolean(secureField)
                });
            }
        } catch (err) {
            console.warn(`fetchNodesFromApis: failed to fetch from ${src.url} - ${err.message}`);
        }
    }

    return nodes;
}

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

    // Fetch nodes from the provided REST endpoints
    const Nodes = await fetchNodesFromApis();

    if (!Nodes.length) {
        console.error('No Lavalink nodes found from APIs. Please check the SSL/NonSSL endpoints and ensure they return node lists. Exiting.');
        process.exit(1);
    }

    console.log(`Using ${Nodes.length} Lavalink node(s) from API`);

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

    // Periodic node refresh configuration (minutes)
    const NODE_REFRESH_MINUTES = Number(process.env.NODE_REFRESH_MINUTES) || 10;
    const NODE_REFRESH_MS = NODE_REFRESH_MINUTES * 60 * 1000;

    // Keep track of current nodes and provide a small equality function
    let currentNodes = Nodes;
    const nodeKey = n => `${n.url}:${n.port}:${n.auth}:${n.secure}`;
    const nodesEqual = (a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        const aKeys = new Set(a.map(nodeKey));
        const bKeys = new Set(b.map(nodeKey));
        if (aKeys.size !== bKeys.size) return false;
        for (const k of aKeys) if (!bKeys.has(k)) return false;
        return true;
    };

    async function refreshNodes() {
        try {
            const newNodes = await fetchNodesFromApis();
            if (!newNodes.length) {
                console.warn('refreshNodes: no nodes returned from APIs, keeping existing nodes');
                return;
            }
            if (nodesEqual(newNodes, currentNodes)) return; // no change

            console.log('Node list changed, attempting to update Kazagumo nodes...');

            // Preferred API: updateNodes
            try {
                if (client.player && typeof client.player.updateNodes === 'function') {
                    await client.player.updateNodes(newNodes);
                    currentNodes = newNodes;
                    console.log('Kazagumo: nodes updated via updateNodes()');
                    return;
                }
            } catch (err) {
                console.warn('refreshNodes: updateNodes failed', err);
            }

            // Best-effort: use nodes collection methods (add/remove) if available
            try {
                const nodesCollection = client.player && client.player.nodes;
                if (nodesCollection) {
                    // Add new nodes
                    for (const n of newNodes) {
                        const exists = currentNodes.some(old => nodeKey(old) === nodeKey(n));
                        if (!exists) {
                            if (typeof nodesCollection.add === 'function') {
                                nodesCollection.add(n);
                                console.log('Kazagumo: added node', n.name || n.url);
                            } else if (typeof client.player.addNode === 'function') {
                                client.player.addNode(n);
                                console.log('Kazagumo: addNode called for', n.name || n.url);
                            }
                        }
                    }

                    // Remove old nodes no longer present
                    if (typeof nodesCollection.remove === 'function') {
                        for (const old of currentNodes) {
                            const still = newNodes.some(nn => nodeKey(nn) === nodeKey(old));
                            if (!still) {
                                try {
                                    const target = old.name || `${old.url}:${old.port}`;
                                    nodesCollection.remove(target);
                                    console.log('Kazagumo: removed node', target);
                                } catch (err) {
                                    console.warn('refreshNodes: failed to remove node', err);
                                }
                            }
                        }
                    }

                    currentNodes = newNodes;
                    return;
                }
            } catch (err) {
                console.warn('refreshNodes: nodes collection update failed', err);
            }

            // If we reached here, we couldn't update nodes programmatically
            console.warn('Automatic node update not available; please restart the bot to apply new nodes');
        } catch (err) {
            console.error('refreshNodes: unexpected error', err);
        }
    }

    // Kick off an immediate refresh attempt and schedule periodic refreshes
    (async () => {
        try { await refreshNodes(); } catch (err) { console.warn('Initial node refresh failed', err); }
        setInterval(() => refreshNodes().catch(err => console.error('Periodic node refresh failed', err)), NODE_REFRESH_MS);
    })();

    client.login(client.config.discord.token);
}

initPlayerAndLogin().catch(err => {
    console.error('Failed to initialize player and login:', err);
    process.exit(1);
});

