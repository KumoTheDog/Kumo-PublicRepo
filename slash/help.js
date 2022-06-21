const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Find out how to talk to Kumo."),

  run: async ({ interaction }) => {
    if (!interaction.guild) {
      return interaction.editReply("You cannot ask for help in a DM.");
    }
    /**
     * Constructs the simple help embed. Has lots of fields for the various commands, which will always be added to! Also has links to the support server,
     * an invite link for the bot and link to top.gg.
     */
    const embed = new MessageEmbed();
    embed.setAuthor({ name: "Kumo The Dog" });
    embed.setColor("#dda15c");
    embed.setTitle("***Hi hi! ૮ ˶ᵔ ᵕ ᵔ˶ ა***");
    embed.setDescription("All functioning commands can be found below!");
    embed.addField(
      `**/askkumo \`<Questions>\`:**`,
      "Ask Kumo a question in the current text channel. Everyone has a cooldown of `10s`."
    );
    embed.addField(
      `**/callkumo:**`,
      "Summon Kumo to your current VC to speak in real-time directly. There is a cooldown of `8s`**/question**, be sure to ask Kumo your questions carefully!"
    );
    embed.addField(`**/kickkumo:**`, "Kick Kumo from the VC.");
    embed.addField(
      `**/kumopoll \`<Question>\` \`<Response 1>\` \`<Response 2>\` \`<Total Responses>\`:**`,
      "Create a poll, comprising of `2` selections! Users can then answer in the poll, until it closes."
    );
    embed.addField(
      `**/leaderboard:**`,
      "Check the current global standings of who has talked to Kumo the most. Displays *text* and *voice* leaderboards as well as your current position in both."
    );
    embed.addField(
      `**/kumoinfo:**`,
      "Find out some miscellaneous statistics about Kumo! Total servers, users, latency, current uptime and more!"
    );
    embed.addField(
      `**/kumomatch \`<Opponent>\` \`<PlayerColour>\` \`<OpponentColour>\`:**`,
      "Play a game of Kumo Match! Get `5` chips in any orientation to win. When a chip is inserted in a chosen column, it travels to the bottom row - any newly placed chips go on top of the last until that column is completely full! A demonstration can be found upon usage."
    );
    embed.addField(
      `**/kumoline \`<Opponent>\` \`<PlayerColour>\` \`<OpponentColour>\`:**`,
      "Play a game of **Kumo Line**! Match `3` hearts in any orientation to win. You can place hearts in any position on the board and a demonstration can be found upon usage!"
    );
    embed.addField(
      `**/kumoduel \`<Opponent>\` \`<BaseHP>\`:**`,
      "Challenge a user to **Kumo Duel**! Turn-based fighting game with ***randomised inventories***, ***custom generated responses*** and ***duel transcripts***!"
    );
    embed.addField(
      `**/kumoduel \`<Opponent>\`:**`,
      "Challenge a user to **Kumo RPS**! Users take turn selecting symbols and win depending on the combination that is picked. A demonstration can be found upon selecting the game! Can be played with 1 or 2 player(s)!"
    );
    embed.addField(
      `**/kumoratio \`<User>\`:**`,
      "Begin a ratio chain! Can be directed towards a specific user, yourself or indirectly within a channel."
    );
    embed.addField(
      `**/feedback:**`,
      "Send direct feedback to the developer of Kumo, through the use of Modals."
    );
    embed.addField(
      `**Invite Link**`,
      "[**Click here**](https://discord.com/oauth2/authorize?client_id=960100480225267733&permissions=2184219648&scope=bot%20applications.commands) to invite Kumo to your server!"
    );
    embed.addField(
      "**Support Server**",
      "[**Click here**](https://discord.gg/vKPnktZan9) to join my support server!"
    );
    embed.addField(
      "**Top.gg**",
      "[**Click here**](https://top.gg/bot/960100480225267733) to upvote Kumo on top.gg!"
    );
    embed.setTimestamp();
    embed.setFooter({
      text: `Developed by \`Saracen#6210\``,
      iconURL: interaction.member.displayAvatarURL(),
    });
    embed.setThumbnail("attachment://main_logo.png");

    interaction.editReply("Help sent to your ***DM's***... ヽ(⌐■_■)ノ♪♬");
    await interaction.user
      .send({
        embeds: [embed],
        files: ["./resources/main_logo.png"],
      })
      .then("Sent help command.")
      .catch(async (e) => {
        console.log("RANDOM DISCORD API ERROR (NON FATAL)" + e);
        await interaction.editReply(
          "Help could not be sent. Please try again."
        );
        return;
      });
  },
};
