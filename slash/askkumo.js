const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const database = require("../events/databasehandler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("askkumo")
    .setDescription("Ask Kumo a question.")
    .addStringOption((option) =>
      option
        .setName("questions")
        .setDescription("Question to ask Kumo.")
        .setRequired(true)
    ),
  //10 second cooldown to stop the user from cheating the gaining of leaderboard spots.
  timeout: 10000,

  run: async ({ interaction }) => {
    /**
     * Array to hold the attachments to send based on the random response. Dynamically changes depending on the random number chosen.
     */
    let arr = ["./resources/main_logo.png"];

    if (!interaction.guild) {
      return interaction.editReply("You cannot ask Kumo a question in a DM.");
    }

    let question = interaction.options.getString("questions");

    //Removes all question marks as a bold one will be included in the final embed.
    let noMark = question.replaceAll("?", "");

    let embed = new MessageEmbed();
    embed.setColor("#dda15c");
    embed
      .setTitle(`${interaction.member.displayName} asked Kumo:`)
      .setThumbnail("attachment://main_logo.png");
    embed.addField(`${interaction.member.displayName}:`, `${noMark}**?**`);
    embed.setTimestamp();
    embed.setFooter({
      text: `${interaction.member.displayName}`,
      iconURL: interaction.member.displayAvatarURL(),
    });

    /**
     * Generating the random response and storing it in a variable.
     */
    let rand = Math.floor(Math.random() * 10);
    console.log("ASKKUMO: Random number generated: " + rand);

    /**
     * Yes and no are the most likely responses, followed by laughing. Then, the least desirable responses, ugh and custom response are least likely.
     */
    switch (rand) {
      //Yes has a 3/10 chance of appearing.
      case 0:
      case 1:
      case 2:
        embed.addField("Kumo:", "***Yes! ૮ ˶´ ᵕˋ ˶ა***");
        embed.setImage("attachment://yes.png");
        arr.push("./resources/yes.png");
        break;

      //No has a 3/10 chance of appearing.
      case 3:
      case 4:
      case 5:
        embed.addField("Kumo:", "***No... ((´д｀))***");
        arr.push("./resources/no.png");
        embed.setImage("attachment://no.png");
        break;

      //Laughing has a 1/5 chance of appearing.
      case 6:
      case 7:
        embed.addField("Kumo:", "***Hoh hoh hoooh! ＼(≧▽≦)／***");
        embed.setImage("attachment://laugh.png");
        arr.push("./resources/laugh.png");
        break;

      //Disgust has a 1/10 chance of appearing.
      case 8:
        embed.addField("Kumo:", "***Ugh... ಠ ೧ ಠ***");
        embed.setImage("attachment://ugh.png");
        arr.push("./resources/ugh.png");
        break;

      //Blush has a 1/10 chance of appearing.
      case 9:
        embed.addField("Kumo:", "***... (´艸｀〃)***");
        embed.setImage("attachment://weird.png");
        arr.push("./resources/weird.png");
        break;
    }

    await database.incrementDB(interaction.user.id, 1, 0, Date.now());
    await interaction
      .editReply({ embeds: [embed], files: [arr[0], arr[1]] })
      .then(console.log(`Sent ${rand} reply.`))
      .catch(async (e) => {
        console.log("RANDOM DISCORD API ERROR (NON FATAL)" + e);
        await interaction.editReply(
          "Kumo didn't understand your question. Please ask again."
        );
        return;
      });
  },
};
