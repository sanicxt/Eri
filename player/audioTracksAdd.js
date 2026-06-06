// Fires on `audioTracksAdd` — emitted when multiple tracks are added to the
// queue at once (e.g. loading a Spotify playlist). We only post a "Queued"
// message for tracks added AFTER playback has started. The first batch of
// tracks is announced by `playerStart` ("Now Playing") and the play command
// reply, so we skip it here to avoid duplicate messages.
module.exports = async (client, queue, tracks) => {
  // Suppress the message for the very first batch of tracks.
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
            description: `🎶 | Queued ${tracks?.length || "multiple"} tracks`,
            color: client.colour,
          },
        ],
      })
      .catch(() => {});
  } catch (err) {
    console.error("audioTracksAdd: send failed", err);
  }
};
