// Fires on `playerFinish` — emitted when a track finishes streaming.
// Clears the now-playing message and resets the 30-min cooldown by
// removing the per-guild voice timeout (legacy; no-op if not used).
const np = require("../bot/nowPlaying");

module.exports = async (client, queue, track) => {
  try {
    await np.clear(client, queue.id);
  } catch (err) {
    console.error("playerFinish: failed to clear now playing", err);
  }
};
