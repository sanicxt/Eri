module.exports = async (client, queue, track) => {
  const meta = queue.metadata || {};
  const channel = meta.channel;
  if (!channel) return;
  try {
    await channel
      .send({
        embeds: [
          {
            description: `⏭️ | Skipping **${track?.title || "track"}** due to a stream issue.`,
            color: client.colour,
          },
        ],
      })
      .catch(() => {});
  } catch (err) {
    console.error("playerSkip: send failed", err);
  }
};
