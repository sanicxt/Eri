// Fires on `queueDelete` — emitted when `queue.delete()` is called (e.g.
// /stop). Clears the now-playing message and announces playback stopped.
const np = require("../bot/nowPlaying");

module.exports = async (client, queue) => {
  const meta = queue.metadata || {};
  const channel = meta.channel;
  try {
    if (channel) {
      await channel.send({
        embeds: [{ description: "✅ | Playback Stopped!", color: client.colour }],
      }).catch(() => {});
    }
  } catch (err) {
    console.error("queueDelete: failed to send stop notice", err);
  }

  try {
    await np.clear(client, queue.id);
  } catch (err) {
    console.error("queueDelete: failed to clear now playing", err);
  }
};
