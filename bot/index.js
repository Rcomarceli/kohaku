// Require the necessary discord.js classes
const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const socketIo = require('socket.io');
// const { Server } = require('socket.io');
const express = require('express');
const { createServer } = require('http');
// const { VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const fetch = require('node-fetch');
const { clientId, clientSecret, port } = require('./config.json');
const { v4: uuidv4 } = require('uuid');

const settings = {
    clientId: clientId,
    clientSecret: clientSecret,
    port: port,
};

// wip:
// websocket auth
// websocket encryption? https://www.section.io/engineering-education/creating-a-real-time-chat-app-with-react-socket-io-with-e2e-encryption/
// react express sameport: https://stackoverflow.com/questions/67254140/is-it-possible-to-run-node-and-react-in-the-same-port
// put an expiration on the session, have that be emitted to react, and have react use that time to determine maxage
// if no session exists, prompt user to relog
// temp import
// make initial check for member a function? or a property of certain events?
// get an existing player first instead of remaking the sound player each time

const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus, getVoiceConnection, getGroups } = require('@discordjs/voice');
const { createReadStream } = require('fs');
const { join } = require('path');

// logging? https://www.reddit.com/r/node/comments/mgxaob/logging_for_side_hobby_projects/
const logger = require('./loggerService');


// the reason we have 2 collections (split into sessionUsers and userDetails) is so we can perform lookups just based on the user later
const sessionUsers = new Collection();
const userDetails = new Collection();

// currently, there is only one player and one voice connection per guild
// guildPlayers tracks each player for each guild as they get created
// the voice connection just gets renewed each time (if we attempt to join the same voicechannel, the method doesnt do anything)
const guildPlayers = new Collection();
// per guild tracking for the bot to leave the channel after it spends too long idle in the channel
const idleTimers = new Collection();

// websocket server

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MEMBERS] });

client.commands = new Collection();


// webserver stuff
const app = express();
const socketPort = '5000';
const server = createServer(app);
const io = socketIo(server, {
    cors: {
        // origin: 'http://192.168.1.168:3000',
		origin: 'http://localhost:3000',
		// origin: '*',
	},
});

// checks to see if person logged in is present in a guild with the bot
async function fetchMember(guilds, userId) {
    for await (const [, g] of guilds) {
        const resolvedGuild = await g.fetch();
        const member = resolvedGuild.members.cache.find(m => m.id == userId && m.voice.channel);
        if (member) {
            logger.info('found member!');
            return member;
        }
    }
}

async function oauthAuthenticateUser(oauthCode, oauthSettings) {
    console.log('code is: ', oauthCode);
    const request = {
        method: 'POST',
        body: new URLSearchParams({
            client_id: oauthSettings.clientId,
            client_secret: oauthSettings.clientSecret,
            code: oauthCode,
            grant_type: 'authorization_code',
            redirect_uri: `http://localhost:${oauthSettings.port}`,
            scope: 'identify',
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    };
    console.log('heres the request', request);
    const oauthResult = await fetch('https://discord.com/api/oauth2/token', request);
    console.log(oauthResult);
    if (oauthResult.status === 400) return 'invalidCode';
    return oauthResult;
}

async function fetchUserPayload(oauthData) {
    const userResult = await fetch('https://discord.com/api/users/@me', {
        headers: {
            authorization: `${oauthData.token_type} ${oauthData.access_token}`,
        },
    });
    const res = await userResult.json();
    return res;
}

// determine if id is userId or sessionId. if 36, sessionId, if 18, userId
function getSession(id) {
    const userId = id?.length === 36 ? sessionUsers.get(id) : id;
    // const userId = id.length === 36 ? sessionUsers.get(id) : id;
    return userDetails.get(userId);
}

function setSession(sessionId, userId, userInfo) {
    sessionUsers.set(sessionId, userId);
    userDetails.set(userId, userInfo);
}

function deleteSession(sessionId) {
    const userId = sessionUsers.get(sessionId);
    userDetails.delete(userId);
    sessionUsers.delete(sessionId);
}

function setMember(member) {
    const userInfo = userDetails.get(member.user.id);
    if (!userInfo) return logger.error('no user found for that member!');
    userInfo.member = member;
    userDetails.set(userInfo);
}

function vcCleanup(guildId) {
    const voiceConn = getVoiceConnection(guildId);
    voiceConn.destroy();
    // logger.info('destroyed connection for guildID ', guildId)
}


// run react and express on same server: https://www.bezkoder.com/integrate-react-express-same-server-port/
// https://stackoverflow.com/questions/50074078/how-to-emit-data-with-socket-io-client-side

// wrap a lot of this in a try block so we dont crash upon a single error
io.on('connection', async (socket) => {
    logger.info(`socket created: ${socket.id}`);
    const guilds = await client.guilds.fetch();
    
    
    // trying to send emits without an initial 'ready' from the server can result in emits being missed
    socket.emit('ready');
    
    socket.on('testEmit', (msg) => {
        console.log(msg);
    });
    
    socket.on('logout', async (sessionId) => {
        const session = getSession(sessionId);
        if (session) deleteSession(sessionId);
        console.log('logged out!');
        socket.emit('logoutSuccess');
        
        // simulate api delay
        // setTimeout(() => socket.emit('logoutSuccess'), 2000);
    });
    socket.on('cookieAuthRequest', async (sessionId) => {
        logger.info('got cookie auth request');
        const session = getSession(sessionId);
        if (!session) {
            socket.emit('cookieAuthFail', `no session exists for ${sessionId}! returning...`);
            return console.log(`no session exists for ${sessionId}! returning...`);
        }
        console.log('session from bot pov is: ', session);
        // setTimeout(() => socket.emit('cookieAuthSuccess'), 2000);
        socket.emit('cookieAuthSuccess');
    });
    
    socket.on('codeAuthRequest', async (msg) => {
        logger.info('codeAuthRequest incoming');
        const code = msg.code;
        const oauthResult = await oauthAuthenticateUser(code, settings);
        if (oauthResult === 'invalidCode') return socket.emit('discordError', 'discord indicated code is invalid! try relogging!');
        
        const oauthData = await oauthResult.json();
        console.log(oauthData);
        const res = await fetchUserPayload(oauthData);
        
        const userId = res.id;
        const member = await fetchMember(guilds, res.id);
        // need to account if member isnt found
        const userInfo = {
            userId: res.id,
            member: member,
            oauthData: { ...oauthData },
        };
        const sessionId = uuidv4();
        setSession(sessionId, userId, userInfo);
        console.log('sessions', sessionUsers);
        // setTimeout(() => socket.emit('codeAuthSuccess', sessionId), 2000);
        socket.emit('codeAuthSuccess', sessionId);
    });
    
    socket.on('requestUserPayload', async (sessionId) => {
        console.log('got request for user payload!');
        const session = getSession(sessionId);
        if (!session) return logger.info(`session id is invalid: ${sessionId}`);
        console.log('heres the session is requestuserpayload: ', session);
        const res = await fetchUserPayload(session.oauthData);
        const payload = {
            username: res.username,
            discriminator: res.discriminator,
            id: res.id,
            avatar: res.avatar,
        };
        socket.emit('userPayload', payload);
    });
    
    socket.on('sendRequest', (msg) => {
        console.log('got send request!');
        console.log('socket id', socket.id);
        const session = getSession(msg);
        const response = session ? session : 'no session exists with that id!';
        socket.emit('requestResponse', response);
    });
    
	socket.on('pushButton', async (msg) => {
        const session = getSession(msg.sessionId);
        if (!session) {
            logger.info(`invalid session ID: ${msg.sessionId}`);
            return socket.emit('invalidSession');
        }
        // if invalid session (replicate this by having a cookie and then restarting bot)
        // emit a "invalidSession"
        // on react, basically destroy the cookie and log back in
        
        // uses cached member from voicestateupdate. if member cant be found, this is usually right when the member logged in
        const member = session.member ? session.member : await fetchMember(guilds, session.id);
        
        if (!member) {
            console.log('no member found!');
            socket.emit('discordError', 'no member found!');
            return;
        }
        
        if (!member.voice.channel) {
            return socket.emit('discordError', 'you arent in VC!');
        }
        
                    
        // refactor this join + 'opus' thing
        const resource = createAudioResource(createReadStream(join(__dirname, 'sounds', msg.name) + '.opus', {
            inputType: StreamType.OggOpus,
        }));

        const connection = joinVoiceChannel({
            channelId: member.voice.channel.id,
            guildId: member.guild.id,
            adapterCreator: member.guild.voiceAdapterCreator,
        });

        // maybe we should just attach the guildplayer to the actual guild object in its collection?
        let player = guildPlayers.get(member.guild.id)
        if (!player) {
            player = createAudioPlayer();
            let timeout = idleTimers.get(member.guild.id)

            player.on('error', error => {
                console.error('Error:', error.message, 'with track', error.resource.metadata.title);
            });

            player.on(AudioPlayerStatus.Playing, () => {
                console.log('The audio player has started playing!');

                if (timeout) clearTimeout(timeout);
            });

            player.on(AudioPlayerStatus.Idle, () => {
                console.log('audio player now idle!');

                // get new connection since connection doesnt renew if you attempt to join the same voice channel above
                timeout = setTimeout(() => vcCleanup(member.guild.id), 30_000)
                idleTimers.set(member.guild.id, timeout)

            });

            player.on('error', error => {
                logger.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
                player.play(getNextResource());
            });
            
            guildPlayers.set(member.guild.id, player)
        }
        
        // redundant subscription since itll subscribe each time
        connection.subscribe(player)

        logger.info(`user ${member.user.username}(${member.user.id}) played ${msg.name} in ${member.guild.name}`);
        player.play(resource);
        
    });
    
    socket.on('disconnect', (reason) => {
        logger.info(`socket destroyed: ${socket.id} due to ${reason}`);
    });
});

// need to export these before files since some of the files depend on these exports
            
module.exports = {
    setMember,
    userDetails,
};

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    // Set a new item in the Collection
    // With the key as the command name and the value as the exported module
    client.commands.set(command.data.name, command);
}

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Login to Discord with your client's token
client.login(token);

server.listen(socketPort, err => {
    if (err) console.log(err);
    console.log(`server running on port ${socketPort}`);
});