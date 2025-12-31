const skip = require("../commands/music/skip");
const stop = require("../commands/music/stop");
const queueCmd = require("../commands/music/queue");
const pp = require('../bot/buttons');
const { GuildMember, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');

// Constants for button IDs
const BUTTON_IDS = {
    PAUSE_RESUME: 'pause/resumebtn',
    SKIP: 'skipbtn',
    STOP: 'stopbtn',
    VOL_DOWN: 'voldownbtn',
    VOL_UP: 'volupbtn',
    QUEUE: 'queuebtn'
};

// Helper function to check voice permissions
const checkVoicePermissions = (interaction, player = null) => {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
        throw new Error("You are not in a voice channel!");
    }
    // Get bot's voice channel from guild.me or fallback to player.voiceId
    const botVoiceChannelId = interaction.guild.me?.voice?.channelId || player?.voiceId;
    const memberVoiceChannelId = interaction.member?.voice?.channelId;

    if (botVoiceChannelId && memberVoiceChannelId !== botVoiceChannelId) {
        throw new Error("You are not in my voice channel!");
    }
};

// Helper function to check if music is playing or paused
const checkMusicPlaying = (query) => {
    // Allow control when a track is playing or paused (so resume works)
    // Also allow if there's a current track in queue (handles transient states like moving)
    if (!query || (!query.playing && !query.paused && !query.queue?.current)) {
        throw new Error("❌ | No music is being played!");
    }
};

// Helper function to handle volume changes
const handleVolumeChange = (query, delta) => {
    //if vol is less than 0 or greater than 100, set it to 0 or 100 respectively
    const newVolume = Math.max(0, Math.min(100, query.volume + delta));
    query.setVolume(newVolume);
};

module.exports = async (client, interaction) => {
    try {
        // Handle non-button, non-command, and non-select interactions
        if (!interaction.isButton() && !interaction.isCommand() && !interaction.isStringSelectMenu()) return;

        const query = client.player.getPlayer(interaction.guildId);

        // Handle select interactions (queue selection)
        if (interaction.isStringSelectMenu()) {
            const cid = interaction.customId;
            if (cid.startsWith('queue_select:')) {
                await handleQueueSelect(interaction, cid);
                return;
            }
            return;
        }

        // Handle button interactions
        if (interaction.isButton()) {
            const cid = interaction.customId;

            // Pagination and queue-related button ids (patterned)
            if (cid.startsWith('queue_prev:') || cid.startsWith('queue_next:') || cid.startsWith('queue_close:') || cid.startsWith('queue_select:')) {
                if (cid.startsWith('queue_select:')) await handleQueueSelect(interaction, cid);
                else await handleQueuePagination(interaction, cid);
                return;
            }

            switch (cid) {
                case BUTTON_IDS.PAUSE_RESUME:
                    await handlePauseResume(interaction, query);
                    break;
                case BUTTON_IDS.SKIP:
                    await skip.execute(client, interaction);
                    break;
                case BUTTON_IDS.STOP:
                    await stop.execute(client, interaction);
                    break;
                case BUTTON_IDS.VOL_DOWN:
                    await handleVolumeButton(interaction, query, -10);
                    break;
                case BUTTON_IDS.VOL_UP:
                    await handleVolumeButton(interaction, query, 10);
                    break;
                case BUTTON_IDS.QUEUE:
                    await handleQueueButton(interaction, query);
                    break;
            }
            return;
        }

        // Handle commands
        if (!interaction.guildId) return;

        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(client, interaction);

    } catch (error) {
        console.error('Error in interaction:', error);
        const reply = {
            content: error.message || "An error occurred!",
            flags: MessageFlags.Ephemeral
        };

        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
};

// Helper functions for handling specific button actions
async function handlePauseResume(interaction, query) {
    checkVoicePermissions(interaction, query);
    checkMusicPlaying(query);

    const isPaused = query.paused;
    query.pause(!isPaused);

    await interaction.update({
        components: [isPaused ? pp.pause() : pp.resume()]
    });
}

async function handleVolumeButton(interaction, query, delta) {
    checkVoicePermissions(interaction, query);
    checkMusicPlaying(query);

    handleVolumeChange(query, delta);
    await interaction.update({ components: [pp.pause()] });
}

async function handleQueuePagination(interaction, customId) {
    // customId format: queue_prev:<userId>:<page> | queue_next:<userId>:<page> | queue_close:<userId>
    const parts = customId.split(':');
    const action = parts[0];
    const ownerId = parts[1];

    // Ensure only the original user can paginate/close
    if (interaction.user.id !== ownerId) {
        return void interaction.reply({ content: "This pagination session is for a different user.", flags: MessageFlags.Ephemeral });
    }

    if (action === 'queue_close') {
        // Close and clear session
        await clearQueueSession(interaction.client, interaction.guildId, ownerId);
        return void interaction.update({ content: 'Closed', embeds: [], components: [] });
    }

    const targetPage = parseInt(parts[2], 10) || 0;
    const player = interaction.client.player.getPlayer(interaction.guildId);
    if (!player || !player.playing) return void interaction.update({ content: "❌ | No music is being played!", embeds: [], components: [] });

    // Validate there is an active session
    if (!isQueueSessionValid(interaction.client, interaction.guildId, ownerId)) {
        await clearQueueSession(interaction.client, interaction.guildId, ownerId);
        return void interaction.update({ content: "No active queue session. Please reopen the queue.", embeds: [], components: [] });
    }

    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil((player.queue?.length || 0) / pageSize));
    const resp = queueCmd.buildQueueEmbed(interaction.client, player, targetPage, pageSize);
    if (!resp) return void interaction.update({ content: "❌ | No music is being played!", embeds: [], components: [] });

    const select = buildQueueSelect(interaction.user.id, player, targetPage, pageSize);
    const row = require('../bot/buttons').queuePageButtons(interaction.user.id, targetPage, totalPages);
    const components = [...(select ? [select] : []), row];
    return void interaction.update({ ...resp, components });
}

function buildQueueSelect(userId, player, page, pageSize) {
    const start = page * pageSize;
    const items = (player.queue || []).slice(start, start + pageSize);
    const options = items.map((m, i) => ({
        label: `${start + i + 1}. ${m.title.substring(0, 100)}`,
        description: `${m.author || ''} • ${(getTrackLengthMs(m) > 0 ? formatDuration(getTrackLengthMs(m)) : '?:??')}`.substring(0, 100),
        value: String(start + i)
    }));

    // Don't build a select if there are no options (Discord requires 1-25 options)
    if (!options.length) return null;

    const select = new StringSelectMenuBuilder()
        .setCustomId(`queue_select:${userId}:${page}`)
        .setPlaceholder('Select a track to play now')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);
    return row;
}

function formatDuration(ms = 0) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getTrackLengthMs(track) {
    if (!track) return 0;
    if (typeof track.length === 'number' && track.length) return track.length;
    if (typeof track.duration === 'number' && track.duration) return track.duration;
    if (track?.info?.length) return track.info.length;
    return 0;
}

// Session helpers: ensure sessions map, create session (auto-expire), clear session, validate session
function ensureQueueSessions(client) {
    if (!client.queueSessions) client.queueSessions = new Map();
}

function getSessionKey(guildId, userId) {
    return `${guildId}:${userId}`;
}

async function createQueueSession(client, guildId, userId, interaction, options = {}) {
    ensureQueueSessions(client);
    const key = getSessionKey(guildId, userId);
    // Only ephemeral sessions are supported now — overwrite any existing session entry
    client.queueSessions.set(key, { type: 'ephemeral', interactionToken: interaction.token, createdAt: Date.now() });
}

async function clearQueueSession(client, guildId, userId) {
    ensureQueueSessions(client);
    const key = getSessionKey(guildId, userId);
    const entry = client.queueSessions.get(key);
    if (!entry) return;
    client.queueSessions.delete(key);
}

function isQueueSessionValid(client, guildId, userId) {
    ensureQueueSessions(client);
    const key = getSessionKey(guildId, userId);
    const entry = client.queueSessions.get(key);
    return !!entry; // session considered valid as long as it exists (no TTL)
}

async function handleQueueButton(interaction, query) {
    checkVoicePermissions(interaction, query);
    checkMusicPlaying(query);

    const pageSize = 5;
    const page = 0;
    const totalPages = Math.max(1, Math.ceil((query.queue?.length || 0) / pageSize));

    // Use helper from queue command to build a consistent embed
    const resp = queueCmd.buildQueueEmbed(interaction.client, query, page, pageSize);
    if (!resp) {
        await interaction.reply({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });
        return;
    }

    // Include pagination buttons and a select menu for choosing a track (show when the current page has items)
    const select = buildQueueSelect(interaction.user.id, query, page, pageSize);
    const row = require('../bot/buttons').queuePageButtons(interaction.user.id, page, totalPages);
    const components = [...(select ? [select] : []), row];

    // Always send as an ephemeral reply so only the clicker sees it
    if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ ...resp, components, flags: MessageFlags.Ephemeral });
    } else {
        await interaction.reply({ ...resp, components, flags: MessageFlags.Ephemeral });
    }
    // Create an ephemeral session to validate subsequent selects
    await createQueueSession(interaction.client, interaction.guildId, interaction.user.id, interaction);
}

async function handleQueueSelect(interaction, customId) {
    // customId format: queue_select:<userId>:<page>
    const parts = customId.split(':');
    const ownerId = parts[1];

    if (interaction.user.id !== ownerId) {
        return void interaction.reply({ content: "This selection is for a different user.", flags: MessageFlags.Ephemeral });
    }

    // Validate there is an active session
    if (!isQueueSessionValid(interaction.client, interaction.guildId, ownerId)) {
        await clearQueueSession(interaction.client, interaction.guildId, ownerId);
        return void interaction.reply({ content: "No active queue session. Please reopen the queue.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const value = interaction.values?.[0];
    if (!value) return void interaction.editReply({ content: "No selection made." });

    const idx = parseInt(value, 10);
    const player = interaction.client.player.getPlayer(interaction.guildId);
    try {
        checkVoicePermissions(interaction, player);
        checkMusicPlaying(player);
    } catch (err) {
        return void interaction.editReply({ content: err.message || "You must be in a voice channel with the bot." });
    }
    const track = player.queue[idx];
    if (!track) return void interaction.editReply({ content: "Selected track is no longer in the queue." });

    try {
        // Remove the track from its current position and play it now
        player.queue.remove(idx);
        await player.play(track);
        return void interaction.editReply({ content: `Now playing **${track.title}**` });
    } catch (err) {
        console.error('handleQueueSelect failed:', err);
        return void interaction.editReply({ content: "Failed to play the selected track." });
    }
}