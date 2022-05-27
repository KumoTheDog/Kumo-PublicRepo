const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const Pretty = require("pretty-ms");
const packageJSON = require("../package.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kumoinfo")
    .setDescription("Find out some interesting information about Kumo!"),

  timeout: 10000,

  run: async ({ client, interaction }) => {
    //Retrieves the total amount of bot RAM use.
    let ramUsage =
      (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + "MB";

    //Displays a running total of the total members in all guilds the bot is in.
    const totalMembers = client.guilds.cache
      .map((guild) => guild.memberCount)
      .reduce((a, b) => a + b, 0);

    //Message embed concisely displays all of this info.
    let infoEmbed = new MessageEmbed()
      .setAuthor({
        name: `${client.user.username} Statistics`,
      })
      .setThumbnail(client.user.displayAvatarURL())
      .setColor("#dda15c")
      .setTimestamp()
      .setFooter({
        text: `${interaction.member.displayName}`,
        iconURL: interaction.member.displayAvatarURL(),
      })
      .addFields(
        {
          name: "Total Guilds",
          value: "```" + client.guilds.cache.size + "```",
          inline: true,
        },
        {
          name: "Users (All Guilds)",
          value: "```" + totalMembers + "```",
          inline: true,
        },
        {
          name: "Created With",
          value:
            "```" +
            `Discord.js: V${packageJSON.dependencies["discord.js"].substring(
              1
            )}, Node.js: V${process.versions.node}` +
            "```",
          inline: false,
        },
        {
          name: "RAM usage",
          value: "```" + ramUsage + "```",
          inline: true,
        },
        {
          name: "Latency",
          value: "```" + client.ws.ping + "ms" + "```",
          inline: true,
        },
        {
          name: "Uptime (since last restart)",
          value: "```" + Pretty(client.uptime) + "```",
          inline: false,
        },
        {
          name: "TOS + Privacy Policy",
          value:
            "[**Terms Of Service**](https://github.com/JSusak/kumo-the-dog-documentation/blob/main/TermsOfServices.md) and [**Privacy Policy**](https://github.com/JSusak/kumo-the-dog-documentation/blob/main/PrivacyPolicy.md) are both found on my [**GitHub**](https://github.com/JSusak) page.",
          inline: true,
        }
      );

    await interaction
      .editReply({ embeds: [infoEmbed] })
      .then(console.log(`Sent info reply.`))
      .catch(async (e) => {
        console.log("RANDOM DISCORD API ERROR (NON FATAL)" + e);
        await interaction.editReply(
          "Kumo couldn't process your request this time. Please try again!"
        );
        return;
      });
  },
};
