const skip = require("../commands/music/skip");
const stop = require("../commands/music/stop");
const queueCmd = require("../commands/music/queue");
const pp = require("../bot/buttons");
const { GuildMember, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require("discord.js");
const { useMainPlayer, useQueue } = require("discord-player");

const BUTTON_IDS = {
  PAUSE_RESUME: "pause/resumebtn",
  SKIP: "skipbtn",
  STOP: "stopbtn",
  VOL_DOWN: "voldownbtn",
  VOL_UP: "volupbtn",
  QUEUE: "queuebtn",
};

const checkVoicePermissions = (interaction) => {
  if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
    throw new Error("You are not in a voice channel!");
  }
  if (
    interaction.guild.members.me?.voice?.channelId &&
    interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId
  ) {
    throw new Error("You are not in my voice channel!");
  }
};

const checkMusicPlaying = (queue) => {
  if (!queue || (!queue.isPlaying() && !queue.node.isPaused())) {
    throw new Error("❌ | No music is being played!");
  }
};

module.exports = async (client, interaction) => {
  try {
    if (!interaction.isButton() && !interaction.isCommand() && !interaction.isStringSelectMenu()) return;

    const player = useMainPlayer();

    // Queue selection from ephemeral menu
    if (interaction.isStringSelectMenu()) {
      const cid = interaction.customId;
      if (cid.startsWith("queue_select:")) {
        // Defer immediately to avoid 3-second timeout
        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (_) {}
        await player.context.provide({ guild: interaction.guild }, () => handleQueueSelect(interaction));
        return;
      }
      return;
    }

    if (interaction.isButton()) {
      const cid = interaction.customId;

      // ACK the button immediately to start the 15-minute follow-up window
      // (and avoid the 3-second initial-response timeout).
      try {
        if (
          cid.startsWith("queue_prev:") ||
          cid.startsWith("queue_next:") ||
          cid.startsWith("queue_select:") ||
          cid === BUTTON_IDS.QUEUE
        ) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        } else {
          // pause/resume, vol ±, skip, stop, queue_close: deferUpdate keeps
          // the original message visible
          await interaction.deferUpdate().catch(() => {});
        }
      } catch (_) {}

      if (cid.startsWith("queue_close:")) {
        // Close is a button-style update; the original message gets cleared.
        return void handleQueueClose(interaction);
      }
      if (cid.startsWith("queue_prev:") || cid.startsWith("queue_next:")) {
        return void (await player.context.provide({ guild: interaction.guild }, () => handleQueuePagination(interaction, cid)));
      }
      if (cid.startsWith("queue_select:")) {
        return void (await player.context.provide({ guild: interaction.guild }, () => handleQueueSelect(interaction)));
      }

      // Music control buttons
      await player.context.provide({ guild: interaction.guild }, async () => {
        const queue = useQueue(interaction.guildId);
        switch (cid) {
          case BUTTON_IDS.PAUSE_RESUME:
            await handlePauseResume(interaction, queue);
            break;
          case BUTTON_IDS.SKIP:
            await skip.execute(client, interaction);
            break;
          case BUTTON_IDS.STOP:
            await stop.execute(client, interaction);
            break;
          case BUTTON_IDS.VOL_DOWN:
            await handleVolumeButton(interaction, queue, -10);
            break;
          case BUTTON_IDS.VOL_UP:
            await handleVolumeButton(interaction, queue, 10);
            break;
          case BUTTON_IDS.QUEUE:
            await handleQueueButton(interaction, queue);
            break;
        }
      });
      return;
    }

    if (!interaction.guildId) return;
    const command = client.commands.get(interaction.commandName);
    if (command) {
      await player.context.provide({ guild: interaction.guild }, () => command.execute(client, interaction));
    }
  } catch (error) {
    console.error("Error in interaction:", error);
    const reply = { content: error.message || "An error occurred!", flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
};

async function handlePauseResume(interaction, queue) {
  checkVoicePermissions(interaction);
  checkMusicPlaying(queue);
  const isPaused = queue.node.isPaused();
  queue.node.setPaused(!isPaused);
  await interaction.update({ components: [isPaused ? pp.pause() : pp.resume()] });
}

async function handleVolumeButton(interaction, queue, delta) {
  checkVoicePermissions(interaction);
  checkMusicPlaying(queue);
  const newVolume = Math.max(0, Math.min(100, queue.node.volume + delta));
  queue.node.setVolume(newVolume);
  await interaction.update({ components: [pp.pause()] });
}

function buildQueueSelect(userId, queue, page, pageSize) {
  const start = page * pageSize;
  const tracks = (queue.tracks?.data || []).slice(start, start + pageSize);
  if (!tracks.length) return null;
  const options = tracks.map((m, i) => ({
    label: `${start + i + 1}. ${m.title.substring(0, 100)}`,
    description: `${m.author || ""} • ${formatDuration(getTrackLengthMs(m))}`.substring(0, 100),
    value: String(start + i),
  }));
  const select = new StringSelectMenuBuilder()
    .setCustomId(`queue_select:${userId}:${page}`)
    .setPlaceholder("Select a track to play now")
    .addOptions(options);
  return new ActionRowBuilder().addComponents(select);
}

function formatDuration(ms = 0) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getTrackLengthMs(track) {
  if (!track) return 0;
  if (typeof track.durationMS === "number" && track.durationMS) return track.durationMS;
  if (typeof track.durationMs === "number" && track.durationMs) return track.durationMs;
  if (track?.raw?.info?.length) return track.raw.info.length;
  return 0;
}

function ensureQueueSessions(client) {
  if (!client.queueSessions) client.queueSessions = new Map();
}
function getSessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}
function isQueueSessionValid(client, guildId, userId) {
  ensureQueueSessions(client);
  return !!client.queueSessions.get(getSessionKey(guildId, userId));
}
function createQueueSession(client, guildId, userId) {
  ensureQueueSessions(client);
  client.queueSessions.set(getSessionKey(guildId, userId), Date.now());
}
function clearQueueSession(client, guildId, userId) {
  ensureQueueSessions(client);
  client.queueSessions.delete(getSessionKey(guildId, userId));
}

async function handleQueueButton(interaction, queue) {
  // interaction already deferred at the entry point
  try {
    checkVoicePermissions(interaction);
    checkMusicPlaying(queue);
  } catch (err) {
    return void interaction.editReply({ content: err.message || "You must be in a voice channel with the bot." }).catch(() => {});
  }

  const pageSize = 5;
  const page = 0;
  const totalPages = Math.max(1, Math.ceil((queue.tracks?.data?.length || 0) / pageSize));

  const resp = queueCmd.buildQueueEmbed(interaction.client, queue, page, pageSize);
  if (!resp) {
    return void interaction.editReply({ content: "❌ | No music is being played!", embeds: [], components: [] }).catch(() => {});
  }

  const select = buildQueueSelect(interaction.user.id, queue, page, pageSize);
  const row = require("../bot/buttons").queuePageButtons(interaction.user.id, page, totalPages);
  const components = [...(select ? [select] : []), row];

  await interaction.editReply({ ...resp, components }).catch(() => {});
  createQueueSession(interaction.client, interaction.guildId, interaction.user.id);
}

async function handleQueueClose(interaction) {
  const parts = interaction.customId.split(":");
  const ownerId = parts[1];
  if (interaction.user.id !== ownerId) {
    // Already deferred; send ephemeral reply
    return void interaction.editReply({ content: "This is for a different user." }).catch(() => {});
  }
  clearQueueSession(interaction.client, interaction.guildId, ownerId);
  return void interaction.editReply({ content: "Closed", embeds: [], components: [] }).catch(() => {});
}

async function handleQueuePagination(interaction, customId) {
  // Already deferred at the entry point
  const parts = customId.split(":");
  const action = parts[0];
  const ownerId = parts[1];

  if (interaction.user.id !== ownerId) {
    return void interaction.editReply({ content: "This pagination session is for a different user." }).catch(() => {});
  }

  if (action === "queue_close") {
    clearQueueSession(interaction.client, interaction.guildId, ownerId);
    return void interaction.editReply({ content: "Closed", embeds: [], components: [] }).catch(() => {});
  }

  const targetPage = parseInt(parts[2], 10) || 0;
  const queue = useQueue(interaction.guildId);
  if (!queue || !queue.isPlaying()) {
    return void interaction.editReply({ content: "❌ | No music is being played!", embeds: [], components: [] }).catch(() => {});
  }
  if (!isQueueSessionValid(interaction.client, interaction.guildId, ownerId)) {
    clearQueueSession(interaction.client, interaction.guildId, ownerId);
    return void interaction.editReply({
      content: "No active queue session. Please reopen the queue.",
      embeds: [],
      components: [],
    }).catch(() => {});
  }

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil((queue.tracks?.data?.length || 0) / pageSize));
  const resp = queueCmd.buildQueueEmbed(interaction.client, queue, targetPage, pageSize);
  if (!resp) {
    return void interaction.editReply({ content: "❌ | No music is being played!", embeds: [], components: [] }).catch(() => {});
  }

  const select = buildQueueSelect(interaction.user.id, queue, targetPage, pageSize);
  const row = require("../bot/buttons").queuePageButtons(interaction.user.id, targetPage, totalPages);
  const components = [...(select ? [select] : []), row];
  return void interaction.editReply({ ...resp, components }).catch(() => {});
}

async function handleQueueSelect(interaction) {
  // interaction was already deferred at the entry point of interactionCreate
  if (!interaction.deferred && !interaction.replied) {
    try { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); } catch (_) {}
  }

  const parts = interaction.customId.split(":");
  const ownerId = parts[1];

  if (interaction.user.id !== ownerId) {
    return void interaction.editReply({ content: "This selection is for a different user." }).catch(() => {});
  }
  if (!isQueueSessionValid(interaction.client, interaction.guildId, ownerId)) {
    clearQueueSession(interaction.client, interaction.guildId, ownerId);
    return void interaction.editReply({ content: "No active queue session. Please reopen the queue." }).catch(() => {});
  }

  const value = interaction.values?.[0];
  if (value == null) return void interaction.editReply({ content: "No selection made." }).catch(() => {});

  const idx = parseInt(value, 10);
  const queue = useQueue(interaction.guildId);
  try {
    checkVoicePermissions(interaction);
    checkMusicPlaying(queue);
  } catch (err) {
    return void interaction.editReply({ content: err.message || "You must be in a voice channel with the bot." }).catch(() => {});
  }

  const tracks = queue.tracks?.data || [];
  if (!tracks[idx]) return void interaction.editReply({ content: "Selected track is no longer in the queue." }).catch(() => {});
  const track = tracks[idx];

  try {
    queue.node.skipTo(track);
    return void interaction.editReply({ content: `Now playing **${track.title}**` }).catch(() => {});
  } catch (err) {
    console.error("handleQueueSelect failed:", err);
    return void interaction.editReply({ content: "Failed to play the selected track." }).catch(() => {});
  }
}
