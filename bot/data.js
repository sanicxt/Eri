module.exports = { 
    commands:[
    {
        name:"ping",
        description: "Shows The Ping of the bot"
    },
    {
        name: "play",
        description: "Plays a song",
        options: [
            {
                name: "query",
                type: 3,
                description: "The song you want to play",
                required: true
            }
        ]
    },
    {
        name: "volume",
        description: "Sets music volume",
        options: [
            {
                name: "amount",
                type: 4,
                description: "The volume amount to set (0-100)",
                required: false
            }
        ]
    },
    {
        name: "loop",
        description: "Sets loop mode",
        options: [
            {
                name: "mode",
                type: 4,
                description: "Loop type",
                required: true,
                choices: [
                    {
                        name: "Off",
                        value: 0
                    },
                    {
                        name: "Track",
                        value: 1
                    },
                    {
                        name: "Queue",
                        value: 2
                    }
                ]
            }
        ]
    },
    {
        name: "filters",
        description: "Apply audio filters to the track",
        options: [
    {
        
        name: "effect",
        description: "Select the effect you want to apply",
        type: 4,
        choices: [
            {
                name: "clear",
                value: "0"
            },
            {
                name: "eightD",
                value: "1"
            },
            {
                name: "soft",
                value: "2"
            },
            {
                name: "speed",
                value: "3"
            },
            {
                name: "karaoke",
                value: "4"
            },
            {
                name: "nightcore",
                value: "5"
            },
            {
                name: "pop",
                value: "6"
            },
            {
                name: "vaporwave",
                value: "7"
            },
            {
                name: "bass",
                value: "8"
            },
            {
                name: "party",
                value: "9"
            },
            {
                name: "earrape",
                value: "10"
            },
            {
                name: "equalizer",
                value: "11"
            },
            {
                name: "electronic",
                value: "12"
            },
            {
                name: "radio",
                value: "13"
            },
            {
                name: "tremolo",
                value: "14"
            },
            {
                name: "treblebass",
                value: "15"
            },
            {
                name: "vibrato",
                value: "16"
            },
            {
                name: "china",
                value: "17"
            },
            {
                name: "chimpunk",
                value: "18"
            },
            {
                name: "darthvader",
                value: "19"
            },
            {
                name: "daycore",
                value: "20"
            },
            {
                name: "doubletime",
                value: "21"
            },
            {
                name: "pitch",
                value: "22"
            },
            {
                name: "rate",
                value: "23"
            },
            {
                name: "slow",
                value: "24"
            },
        ]
    }
]
    },
    {
        name: "shuffle",
        description: "Shuffles The Queue"
    },
    {
        name: "skip",
        description: "Skip to the current song"
    },
    {
        name: "queue",
        description: "See the queue"
    },
    {
        name: "pause",
        description: "Pause the current song"
    },
    {
      name: "uptime",
      description: "Shows The Bot Uptime"
    },
    {
        name: "resume",
        description: "Resume the current song"
    },
    {
        name: "stop",
        description: "Stop the player"
    },
    {
        name: "setnode",
        description: "Update Lavalink node configuration (admin only)",
        options: [
            {
                name: "config",
                description: "JSON configuration for the node",
                type: 3,
                required: true
            },
            {
                name: "test",
                description: "Test the connection to the new node",
                type: 5,
                required: false
            }
        ]
    },
] };