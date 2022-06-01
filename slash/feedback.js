const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageEmbed,
  MessageActionRow,
  Modal,
  TextInputComponent,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feedback")
    .setDescription(
      "Provide feedback to the developer of Kumo. Feel free to type anything about the bot."
    ),
  //5 minutes cooldown to restrict users from spamming the developer with messages.
  timeout: 300000,

  run: async ({ interaction }) => {
    var feedChannel = process.env.FEEDBACKCHANNEL;
    //Construct the feedback modal.
    const feedbackModal = new Modal()
      .setCustomId("feedback")
      .setTitle("Kumo Feedback Form");

    //Construct text inputs
    const positiveInput = new TextInputComponent()
      .setCustomId("positiveInput")
      .setLabel("What aspects did you enjoy while using Kumo?")
      .setStyle("SHORT");

    const futureInput = new TextInputComponent()
      .setCustomId("futureInput")
      .setLabel("Are there any features that you would like?")
      .setStyle("SHORT");

    const bugInput = new TextInputComponent()
      .setCustomId("bugInput")
      .setLabel("Have you seen any bugs during bot usage?")
      .setStyle("SHORT");

    const firstActionRow = new MessageActionRow().addComponents(positiveInput);
    const secondActionRow = new MessageActionRow().addComponents(futureInput);
    const thirdActionRow = new MessageActionRow().addComponents(bugInput);

    feedbackModal.addComponents(
      firstActionRow,
      secondActionRow,
      thirdActionRow
    );

    await interaction.showModal(feedbackModal);
  },
};
