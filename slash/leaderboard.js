const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const Messages = require("../models/benSchema2");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription(
      "Check who has talked to Kumo the most in the last 30 days! Seperate leaderboard for text and voice."
    ),
  timeout: 10000,

  run: async ({ client, interaction }) => {
    //Stops any unwanted inputs (in DMs.)
    if (!interaction.guild) {
      return interaction.editReply(
        "You cannot check the leaderboards in a DM."
      );
    }

    //If you are running the bot using the public version, this command WILL NOT WORK unless you have a mongoDB link and a generated encryption/signing key.
    if (!process.env.DBTOKEN || !process.env.ASTRING || !process.env.BSTRING) {
      return interaction.editReply(
        "This command cannot execute without a database. Please make sure you have: The link to the DB, a 32 bit encryption key and a 64 bit signing key."
      );
    }

    //Initial values for user positions - users who have not tried out the bot yet.
    let indivGlobal = "Unidentified - Hasn't Spoken yet";
    let indivPosition = "N/A";

    let indivVoiceGlobal = "Unidentified - Hasn't Spoken yet";
    let indivVoicePosition = "N/A";

    //Gets all the entries from the databases in a sorted fashion.
    const messageOrdered = await Messages.find({}).sort({ messages: -1 });

    let content = "";
    let voiceContent = "";

    //Array storing the different medals available to a user.
    const medals = ["🥇", "🥈", "🥉", "🎖️", "🎖️"];

    //Loop for the top five TEXT users.

    //Separate for loop needed to go through EVERY entry to find the position of the interacting user, who may not be in top 10.
    for (let i = 0; i < messageOrdered.length; i++) {
      if (messageOrdered[i].UserID == interaction.user.id) {
        indivPosition = i + 1;
        indivGlobal = messageOrdered[i].messages;
      }
    }

    //Text positions top 5
    for (let i = 0; i < 5; i++) {
      const userID = await client.users.fetch(messageOrdered[i].UserID);
      let user = userID.username;
      content += `${medals[i]} ${i + 1}: ${user} - ${
        messageOrdered[i].messages
      }\n`;
    }

    //Gets all the entries in the database but this time sort based on voice rather than text messages.
    const voiceOrdered = await Messages.find({}).sort({ voiceMessages: -1 });

    //Loops for the top 5 VOICE users.

    //Separate for loop needed to go through EVERY entry to find the position of the interacting user, who may not be in top 10.
    for (let i = 0; i < voiceOrdered.length; i++) {
      if (voiceOrdered[i].UserID == interaction.user.id) {
        indivVoicePosition = i + 1;
        indivVoiceGlobal = voiceOrdered[i].voiceMessages;
      }
    }

    //Voice
    for (let i = 0; i < 5; i++) {
      const userID = await client.users.fetch(voiceOrdered[i].UserID);
      let user = userID.username;

      voiceContent += `${medals[i]} ${i + 1}: ${user} - ${
        voiceOrdered[i].voiceMessages
      }\n`;
    }

    /**
     * Compiles everything calculated above, putting it into one embed which can easily be viewed.
     */
    const embed = new MessageEmbed();
    embed
      .setColor("#dda15c")
      .setThumbnail("attachment://main_logo.png")
      .setTitle("Kumo Top 5 Global Leaderboard (Last 30 days)")
      .addField("Global Positions (Text):", content)
      .addField(
        "Your Message Amount:",
        `**${indivGlobal}** messages. (Currently at position **${indivPosition}**)`
      )
      .addField("Global Positions (Voice):", voiceContent)
      .addField(
        "Your Voice Chat Amount:",
        `**${indivVoiceGlobal}** messages. (Currently at position **${indivVoicePosition}**)`
      );
    embed.setTimestamp();
    embed.setFooter({
      text: `${interaction.member.displayName}`,
      iconURL: interaction.member.displayAvatarURL(),
    });

    await interaction
      .editReply({ embeds: [embed], files: ["./resources/main_logo.png"] })
      .then(console.log("Sent current leaderboards."))
      .catch(async (e) => {
        console.log("RANDOM DISCORD API ERROR (NON FATAL)" + e);
        await interaction.editReply(
          "Leaderboards could not be sent. Please try again."
        );
        return;
      });
  },
};
