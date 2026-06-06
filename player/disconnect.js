// Fires on `disconnect` — emitted when the bot is disconnected from the
// voice channel (kicked, server connection lost, etc). Clears the
// now-playing message.
const np = require("../bot/nowPlaying");

module.exports = async (client, queue) => {
  const meta = queue.metadata || {};
  const channel = meta.channel;
  try {
    if (channel) {
      await channel.send({
        embeds: [{ description: "❌ | I was disconnected from the voice channel", color: client.colour }],
      }).catch(() => {});
    }
  } catch (err) {
    console.error("disconnect: failed to send notice", err);
  }

  try {
    await np.clear(client, queue.id);
  } catch (err) {
    console.error("disconnect: failed to clear now playing", err);
  }
};
