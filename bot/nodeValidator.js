/**
 * Node Validation and Management Utility
 * Provides validators and helpers for Lavalink node configuration
 */

// Validate JSON node configuration
function validateNodeConfig(config) {
    const errors = [];
    
    // Check required fields
    if (!config.host || typeof config.host !== 'string') {
        errors.push('Missing or invalid `host` field (must be a string)');
    }
    
    if (!config.port || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
        errors.push('Missing or invalid `port` field (must be an integer between 1-65535)');
    }
    
    if (!config.password || typeof config.password !== 'string') {
        errors.push('Missing or invalid `password` field (must be a string)');
    }
    
    if (typeof config.secure !== 'boolean') {
        errors.push('Missing or invalid `secure` field (must be a boolean: true or false)');
    }
    
    // Optional: validate name
    if (config.name && typeof config.name !== 'string') {
        errors.push('Invalid `name` field (must be a string)');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// Test connection to Lavalink node
async function testNodeConnection(config) {
    try {
        const protocol = config.secure ? 'https' : 'http';
        const url = `${protocol}://${config.host}:${config.port}/info`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': config.password
            },
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                data: data,
                message: 'Node connection successful!'
            };
        } else {
            return {
                success: false,
                message: `Node returned status ${response.status}: ${response.statusText}`
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `Connection failed: ${error.message}`
        };
    }
}

// Format configuration for display
function formatNodeConfig(config) {
    return {
        host: config.host,
        port: config.port,
        password: config.password,
        secure: config.secure,
        name: config.name || 'Unnamed'
    };
}

// Get example configuration
function getExampleConfig() {
    return {
        host: "lavalinkv4.serenetia.com",
        port: 443,
        password: "https://dsc.gg/ajidevserver",
        secure: true,
        name: "Serenetia" // Optional
    };
}

module.exports = {
    validateNodeConfig,
    testNodeConnection,
    formatNodeConfig,
    getExampleConfig
};
