const np = require("../bot/nowPlaying");

module.exports = async (client, queue, error) => {
  console.error(`[queue error] guild=${queue?.id}:`, error?.message || error);
  const meta = queue?.metadata || {};
  const channel = meta.channel;
  try {
    if (channel) {
      await channel
        .send({ embeds: [{ description: `❌ | Queue error: ${error?.message || "unknown"}`, color: client.colour }] })
        .catch(() => {});
    }
  } catch (e) {
    console.error("error handler: send failed", e);
  }
  try {
    if (queue) await np.clear(client, queue.id);
  } catch (err) {
    console.error("error handler: failed to clear now playing", err);
  }
};
