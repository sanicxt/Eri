const buttons = require("../bot/buttons");
const np = require("../bot/nowPlaying");

module.exports = async (client, queue, track) => {
  const meta = queue.metadata || {};
  const channel = meta.channel;
  if (!channel) return;

  const row = buttons.pause();
  const queueRow = buttons.queue();
  try {
    const message = await channel.send({
      embeds: [
        {
          title: "🎶 | Now Playing",
          description: `[${track.title}](${track.url}) in **${channel.guild.members.me?.voice?.channel?.name || "voice"}**!`,
          color: client.colour,
          thumbnail: { url: track.thumbnail || track.raw?.info?.artworkUrl || "" },
        },
      ],
      components: [row, queueRow],
    });
    await np.set(client, queue.id, message);
  } catch (err) {
    console.error("playerStart: failed to send/set now playing", err);
  }
};
