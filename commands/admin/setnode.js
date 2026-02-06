const { EmbedBuilder } = require('discord.js');
const { validateNodeConfig, testNodeConnection, getExampleConfig } = require('../../bot/nodeValidator');

// Sanitize and parse node configuration input
function sanitizeNodeConfig(input) {
    try {
        // Try parsing as JSON first
        return JSON.parse(input);
    } catch (e) {
        // Parse as key-value format
        const config = {};
        const keys = ['host', 'port', 'password', 'secure', 'name'];
        
        // Create a regex that matches any key-value pair
        // Matches: key : value or key = value or key:value
        for (const key of keys) {
            // Look for the key followed by : or = and capture everything until next key or end
            const regex = new RegExp(`${key}\\s*[:=]\\s*([^\\n]*?)(?=${keys.map(k => `(?:${k}\\s*[:=])`).join('|')}|$)`, 'i');
            const match = input.match(regex);
            
            if (match && match[1]) {
                let value = match[1].trim();
                // Remove trailing whitespace and special chars
                value = value.replace(/[\s:;,]+$/, '').trim();
                
                if (value) {
                    // Convert to appropriate type
                    if (key === 'port') {
                        const portNum = parseInt(value, 10);
                        if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
                            config[key] = portNum;
                        }
                    } else if (key === 'secure') {
                        config[key] = value.toLowerCase() === 'true' || value === '1' || value === 'yes';
                    } else if (key === 'host' || key === 'password' || key === 'name') {
                        config[key] = value;
                    }
                }
            }
        }
        
        // Ensure all required fields are present
        if (config.host && config.port && config.password && config.secure !== undefined) {
            return config;
        }
        
        console.log('Parsed config:', config, 'from input:', input);
        return null;
    }
}

module.exports = {
    name: 'setnode',
    category: 'Admin',
    utilisation: '/setnode config:<json> [test:true/false]',
    description: 'Update Lavalink node configuration (admin only)',
    options: [
        {
            name: 'config',
            description: 'JSON configuration for the node',
            type: 3, // STRING
            required: true
        },
        {
            name: 'test',
            description: 'Test the connection to the new node',
            type: 5, // BOOLEAN
            required: false
        }
    ],
    async execute(client, interaction) {
        // Get admin user ID from config
        const ADMIN_USER_ID = client.config.discord.admin_user_id;
        
        // Check if user is authorized
        if (interaction.user.id !== ADMIN_USER_ID) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Access Denied')
                .setDescription(`Only <@${ADMIN_USER_ID}> can use this command.`)
                .setTimestamp();
            
            return interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
        
        await interaction.deferReply({ flags: 64 });
        
        try {
            // Parse JSON configuration
            const configString = interaction.options.getString('config');
            let nodeConfig;
            
            try {
                nodeConfig = sanitizeNodeConfig(configString);
                if (!nodeConfig) {
                    throw new Error('Invalid format');
                }
            } catch (error) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Invalid Input Format')
                    .setDescription(`Failed to parse configuration: ${error.message}`)
                    .addFields(
                        { 
                            name: 'Accepted Formats', 
                            value: '**JSON Format:**\n```json\n{"host": "example.com", "port": 443, "password": "secret", "secure": true}\n```\n**Key-Value Format:**\n```\nHost: example.com\nPort: 443\nPassword: secret\nSecure: true\n```' 
                        },
                        { 
                            name: 'Example Configuration', 
                            value: `\`\`\`json\n${JSON.stringify(getExampleConfig(), null, 2)}\n\`\`\`` 
                        }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }
            
            // Validate configuration
            const validation = validateNodeConfig(nodeConfig);
            if (!validation.valid) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Validation Failed')
                    .setDescription('Configuration validation failed with the following errors:\n' + validation.errors.map(e => `• ${e}`).join('\n'))
                    .addFields(
                        { 
                            name: 'Required Fields',
                            value: '• `host` (string) - Lavalink server hostname\n• `port` (integer 1-65535) - Port number\n• `password` (string) - Authorization password\n• `secure` (boolean) - Use WSS/HTTPS (true/false)'
                        },
                        {
                            name: 'Optional Fields',
                            value: '• `name` (string) - Node identifier'
                        },
                        {
                            name: 'Example Configuration',
                            value: `\`\`\`json\n${JSON.stringify(getExampleConfig(), null, 2)}\n\`\`\``
                        }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }
            
            // Set default name if not provided
            if (!nodeConfig.name) {
                nodeConfig.name = `Node-${Date.now()}`;
            }
            
            // Test connection if requested
            let testResult = null;
            if (interaction.options.getBoolean('test')) {
                testResult = await testNodeConnection(nodeConfig);
            }
            
            // Check if player is initialized
            if (!client.player) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Player Not Ready')
                    .setDescription('The music player is not initialized yet. Please try again in a moment.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }
            
            try {
                // Destroy all existing players first to prevent orphaned players
                const existingPlayers = Array.from(client.player.players.values());
                for (const player of existingPlayers) {
                    try {
                        await player.destroy();
                        console.log(`Destroyed player for guild ${player.guildId}`);
                    } catch (err) {
                        console.warn(`Failed to destroy player for guild ${player.guildId}:`, err.message);
                    }
                }
                
                // Remove all existing nodes
                const existingNodes = Array.from(client.player.shoukaku.nodes.keys());
                for (const nodeName of existingNodes) {
                    client.player.shoukaku.removeNode(nodeName);
                    console.log(`Removed existing node: ${nodeName}`);
                }
                
                // Connect the new node via Shoukaku
                // url: "Lavalink node host and port without any prefix"
                await client.player.shoukaku.addNode({
                    name: nodeConfig.name,
                    url: `${nodeConfig.host}:${nodeConfig.port}`,
                    auth: nodeConfig.password,
                    secure: nodeConfig.secure
                });
                
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Node Updated Successfully')
                    .addFields(
                        { name: 'Name', value: nodeConfig.name, inline: true },
                        { name: 'Host', value: nodeConfig.host, inline: true },
                        { name: 'Port', value: nodeConfig.port.toString(), inline: true },
                        { name: 'Secure', value: nodeConfig.secure ? 'Yes' : 'No', inline: true }
                    );
                
                // Add test result if available
                if (testResult) {
                    successEmbed.addFields({
                        name: '🧪 Connection Test',
                        value: testResult.success 
                            ? `✅ ${testResult.message}` 
                            : `❌ ${testResult.message}`
                    });
                }
                
                successEmbed.setTimestamp();
                
                return interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Failed to Add Node')
                    .setDescription(`Error: ${error.message}`)
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }
            
        } catch (error) {
            console.error('Error in setnode command:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ An Error Occurred')
                .setDescription(`${error.message}`)
                .setTimestamp();
            
            return interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
