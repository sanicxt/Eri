const np = require("../bot/nowPlaying");

module.exports = async (client, queue, error) => {
  const guildId = queue?.id;
  // Log the full error (message + stack) so we can diagnose runtime
  // failures on s390x (DAVE binary crashes, ffmpeg aborts, etc).
  console.error(`[queue error] guild=${guildId}: ${error?.message || error}`);
  if (error?.stack) console.error(error.stack);

  const meta = queue?.metadata || {};
  const channel = meta.channel;
  try {
    if (channel) {
      await channel
        .send({
          embeds: [
            {
              description: `❌ | Queue error: ${(error?.message || "unknown").slice(0, 500)}`,
              color: client.colour,
            },
          ],
        })
        .catch(() => {});
    }
  } catch (e) {
    console.error("error handler: send failed", e);
  }
  try {
    if (queue) await np.clear(client, guildId);
  } catch (err) {
    console.error("error handler: failed to clear now playing", err);
  }
};
