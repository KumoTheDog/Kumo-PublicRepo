const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
} = require("@discordjs/voice");

const { createReadStream } = require("node:fs");
const { join } = require("node:path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kickkumo")
    .setDescription("Kick Kumo from the current VC."),

  run: async ({ client, interaction }) => {
    if (!interaction.guild) {
      return interaction.editReply("You cannot kick Kumo in a DM.");
    }

    function hangUp(channelId) {
      client.channels
        .fetch(channelId)
        .then((channel) => {
          const connection = getVoiceConnection(channel.guild.id);
          let resource = createAudioResource(
            createReadStream(join(__dirname, "../resources/hangup.mp3")),
            {
              inlineVolume: true,
            }
          );
          const player = createAudioPlayer();
          connection.subscribe(player);
          player.play(resource);
          setTimeout(() => player.stop(), 1800);
          console.log("Playing hangup sound...");
        })
        .catch(console.error);
    }

    console.log(interaction.guild.id);
    const connection = getVoiceConnection(interaction.guild.id);
    if (!interaction.member.voice.channel)
      return interaction.editReply("You must be in a VC to kick Kumo.");
    if (!connection)
      return interaction.editReply("Kumo isn't currently in a VC!");

    const kumoChannel = interaction.member.voice.channel.id;
    hangUp(kumoChannel);

    await interaction.editReply("Kumo has been kicked from the VC. ((´д｀))");

    setTimeout(function () {
      connection.destroy();
    }, 1900);
  },
};
