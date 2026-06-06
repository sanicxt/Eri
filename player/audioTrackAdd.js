// Fires on `audioTrackAdd` — emitted when a single track is added to the queue.
// We only post a "Queued" message for tracks added AFTER playback has started.
// The first track is announced by `playerStart` ("Now Playing"), so we skip it
// here to avoid duplicate messages.
module.exports = async (client, queue, track) => {
  // Suppress the message for the very first track (queue not playing yet).
  if (!queue.isPlaying()) return;
  if (!queue.currentTrack) return;

  const meta = queue.metadata || {};
  const channel = meta.channel;
  if (!channel) return;
  try {
    await channel
      .send({
        embeds: [
          {
            description: `🎶 | Queued **${track.title}**`,
            color: client.colour,
          },
        ],
      })
      .catch(() => {});
  } catch (err) {
    console.error("audioTrackAdd: send failed", err);
  }
};
