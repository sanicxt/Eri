// Fires on `emptyQueue` — emitted when the queue is exhausted (last track
// finished, no more tracks queued). discord-player's internal
// leaveOnEndCooldown (30 min, configured in play.js) handles the auto-leave;
// this handler just announces it and clears the now-playing message.
const np = require("../bot/nowPlaying");

module.exports = async (client, queue) => {
  const meta = queue.metadata || {};
  const channel = meta.channel;
  try {
    if (channel) {
      await channel.send({
        embeds: [
          {
            description: "✅ | No More Songs to Play! Leaving in 30 minutes if no new songs are added.",
            color: client.colour,
          },
        ],
      }).catch(() => {});
    }
  } catch (err) {
    console.error("emptyQueue: failed to send notice", err);
  }

  try {
    await np.clear(client, queue.id);
  } catch (err) {
    console.error("emptyQueue: failed to clear now playing", err);
  }
};
