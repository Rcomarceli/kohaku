const { SlashCommandBuilder } = require('@discordjs/builders');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus } = require('@discordjs/voice');
const { createReadStream } = require('fs');
const { join } = require('path');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('joins voice channel!'),
	async execute(interaction) {
        const wait = require('util').promisify(setTimeout);

        const player = createAudioPlayer();
        // An AudioPlayer will always emit an "error" event with a .resource property
        player.on('error', error => {
            console.error('Error:', error.message, 'with track', error.resource.metadata.title);
        });

        player.on(AudioPlayerStatus.Playing, () => {
            console.log('The audio player has started playing!');
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('audio player now idle!');
            connection.destroy();
            player.stop();
        });

        // const resource = createAudioResource('../nothing.mp3', {
        //     metadata: {
        //         title: 'A good song!',
        //     },
        // });

        const resource = createAudioResource(createReadStream(join(__dirname, 'output.opus'), {
            inputType: StreamType.OggOpus,
        }));

        const connection = joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        await interaction.reply({ content: 'joining!', ephemeral: true });
        player.play(resource);
        connection.subscribe(player);
        // await wait(5000);
        // connection.destroy();
        // player.stop();
	},
};