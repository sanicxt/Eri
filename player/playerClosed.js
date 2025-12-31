// playerClosed is now handled by playerMoved (LEFT state).
// This handler is kept as a no-op for compatibility.
module.exports = async (client, player) => {
    // No-op: All cleanup is done in playerMoved LEFT case
}