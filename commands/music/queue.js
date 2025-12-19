const { GuildMember, MessageFlags } = require("discord.js");

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
    // Kazagumo uses `length` (ms), but sometimes `duration` exists; also check nested info
    if (typeof track.length === 'number' && track.length) return track.length;
    if (typeof track.duration === 'number' && track.duration) return track.duration;
    if (track?.info?.length) return track.info.length;
    return 0;
} 

function buildQueueEmbed(client, player, page = 0, pageSize = 5) {
    if (!player || !player.playing) return null;
    const queue = player.queue;
    const currentsong = queue.current;
    const total = queue.length || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const p = Math.min(Math.max(page, 0), totalPages - 1);
    const start = p * pageSize;
    const items = queue.slice(start, start + pageSize).map((m, i) => {
        const trackIndex = start + i + 1;
        const durationMs = getTrackLengthMs(m);
        const duration = durationMs > 0 ? formatDuration(durationMs) : '?:??';
        return `${trackIndex}. **${m.title}** — ${duration}`;
    });

    // Try to determine total duration
    let totalMs = 0;
    if (typeof queue.duration === 'number') totalMs = queue.duration;
    else if (Array.isArray(queue)) totalMs = queue.reduce((acc, t) => acc + getTrackLengthMs(t), 0);

    const embed = {
        title: "Server Queue",
        description: items.length ? items.join("\n") + (total > start + items.length ? `\n...${total - (start + items.length)} more songs` : '') : 'No tracks',
        color: client.colour,
        fields: [
            { name: "Now Playing", value: `🎶 | **${currentsong?.title || 'Nothing'}**` },
            { name: "Queue", value: `${total} track${total !== 1 ? 's' : ''} • ${formatDuration(totalMs)}` }
        ],
        footer: { text: `Page ${p + 1}/${totalPages}` }
    };

    return { embeds: [embed] };
}
module.exports = {
    name: 'queue',
    category: 'Music',
    utilisation: '/queue',

   async execute(client, interaction) {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
        return void interaction.reply({ content: "You are not in a voice channel!", ephemeral: true });
    }

    if (interaction.guild.me?.voice?.channelId && interaction.member?.voice?.channelId !== interaction.guild.me?.voice?.channelId) {
        return void interaction.reply({ content: "You are not in my voice channel!", ephemeral: true });
    }
    await interaction.deferReply();
    const player = client.player.getPlayer(interaction.guildId);
    if (!player || !player.playing) return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });

    const resp = buildQueueEmbed(client, player);
    if (!resp) return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });
    return void interaction.followUp(resp);
  },
  buildQueueEmbed
}