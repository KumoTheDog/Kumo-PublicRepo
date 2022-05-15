const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const Messages = require("../models/benSchema2");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription(
      "Check who has talked to Kumo the most in the last 30 days! Seperate leaderboard for text and voice."
    ),

  run: async ({ client, interaction }) => {
    if (!interaction.guild) {
      return interaction.editReply(
        "You cannot check the leaderboards in a DM."
      );
    }

    if (!process.env.DBTOKEN || !process.env.ASTRING || !process.env.BSTRING) {
      return interaction.editReply(
        "This command cannot execute without a database. Please make sure you have: The link to the DB, a 32 bit encryption key and a 64 bit signing key."
      );
    }

    let indivGlobal = "Unidentified - Hasn't Spoken yet";
    let indivPosition = "N/A";

    let indivVoiceGlobal = "Unidentified - Hasn't Spoken yet";
    let indivVoicePosition = "N/A";

    const messageOrdered = await Messages.find({}).sort({ messages: -1 });

    let content = "";
    let voiceContent = "";

    //Text positions

    for (let i = 0; i < messageOrdered.length; i++) {
      if (messageOrdered[i].UserID == interaction.user.id) {
        indivPosition = i + 1;
        indivGlobal = messageOrdered[i].messages;
      }
    }

    //Text
    for (let i = 0; i < messageOrdered.length; i++) {
      if (i === 5) {
        break;
      }

      const userID = await client.users.fetch(messageOrdered[i].UserID);
      let user = userID.username;

      if (i === 0) {
        content += `🥇 ${i + 1}: ${user} - ${messageOrdered[i].messages}\n`;
      } else if (i === 1) {
        content += `🥈 ${i + 1}: ${user} - ${messageOrdered[i].messages}\n`;
      } else if (i === 2) {
        content += `🥉 ${i + 1}: ${user} - ${messageOrdered[i].messages}\n`;
      } else {
        content += `🎖️ ${i + 1}: ${user} - ${messageOrdered[i].messages}\n`;
      }
    }

    const voiceOrdered = await Messages.find({}).sort({ voiceMessages: -1 });

    //voice positions

    for (let i = 0; i < voiceOrdered.length; i++) {
      if (voiceOrdered[i].UserID == interaction.user.id) {
        indivVoicePosition = i + 1;
        indivVoiceGlobal = voiceOrdered[i].voiceMessages;
      }
    }

    //Voice
    for (let i = 0; i < voiceOrdered.length; i++) {
      if (i === 5) {
        break;
      }

      const userID = await client.users.fetch(voiceOrdered[i].UserID);
      let user = userID.username;

      if (i === 0) {
        voiceContent += `🥇 ${i + 1}: ${user} - ${
          voiceOrdered[i].voiceMessages
        }\n`;
      } else if (i === 1) {
        voiceContent += `🥈 ${i + 1}: ${user} - ${
          voiceOrdered[i].voiceMessages
        }\n`;
      } else if (i === 2) {
        voiceContent += `🥉 ${i + 1}: ${user} - ${
          voiceOrdered[i].voiceMessages
        }\n`;
      } else {
        voiceContent += `🎖️ ${i + 1}: ${user} - ${
          voiceOrdered[i].voiceMessages
        }\n`;
      }
    }

    /**
     * Compiles everything calculated above, putting it into one embed.
     */
    const embed = new MessageEmbed();
    embed
      .setColor("#dda15c")
      .setThumbnail("attachment://main_logo.png")
      .setTitle(
        "Kumo Top 5 Global Leaderboard (Last 30 days) [RESET ON BOT VERIFICATION]"
      )
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
