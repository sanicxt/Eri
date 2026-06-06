const np = require("../bot/nowPlaying");

module.exports = async (client, queue, error, track) => {
  const title = track?.title ? ` **${track.title}**` : "";
  console.error(`playerError from queue ${queue.id}:`, error?.message || error);
  const meta = queue.metadata || {};
  const channel = meta.channel;

  // Detect the "must be signed in" SABR auth failure and give the user an actionable hint.
  const msg = error?.message || String(error || "unknown");
  const isSignInError = /must be signed in|sign.in.required|accounts\.google\.com/i.test(msg);
  const hint = isSignInError
    ? "\n\n💡 YouTube cookies are missing or expired. Re-export `youtube.cookies.txt` from a signed-in YouTube session and restart the bot."
    : "";

  try {
    if (channel) {
      await channel
        .send({
          embeds: [
            {
              description: `❌ | Player error${title}: ${msg.slice(0, 500)}${hint}`,
              color: client.colour,
            },
          ],
        })
        .catch(() => {});
    }
  } catch (e) {
    console.error("playerError: send failed", e);
  }
  try {
    await np.clear(client, queue.id);
  } catch (err) {
    console.error("playerError: failed to clear now playing", err);
  }
};
