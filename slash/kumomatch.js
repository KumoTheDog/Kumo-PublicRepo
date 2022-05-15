const { SlashCommandBuilder } = require("@discordjs/builders");
const { KumoMatch } = require("../games/kumomatch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kumomatch")
    .setDescription(
      "Play a game of Kumo Match! 2 players recommended. Estimated Play-time: 3-5 minutes."
    )
    .addUserOption((option) =>
      option
        .setName("opponent")
        .setDescription("Your worthy opponent!")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("playercolour")
        .setDescription("Your colour!")
        .addChoice("red", "r")
        .addChoice("orange", "o")
        .addChoice("yellow", "y")
        .addChoice("green", "g")
        .addChoice("purple", "p")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("opponentcolour")
        .setDescription("Your opponent's colour!")
        .addChoice("red", "rO")
        .addChoice("orange", "oO")
        .addChoice("yellow", "yO")
        .addChoice("green", "gO")
        .addChoice("purple", "pO")
        .setRequired(true)
    ),

  //Colours, red yellow green orange purple

  run: async ({ client, interaction }) => {
    if (!interaction.guild) {
      await interaction.editReply("You cannot start a game in DM's.");
    }
    if (interaction.options.getUser("opponent").id === client.user.id) {
      await interaction.editReply("You can't start the game against me!");
    } else if (
      interaction.options.getString("playercolour") ===
      interaction.options.getString("opponentcolour").substring(0, 1)
    ) {
      await interaction.editReply(
        "It seems you have chosen the same colours. Please choose separate colours for you and the opponent. ((´д｀))"
      );
    } else if (
      interaction.user.id === interaction.options.getUser("opponent").id
    ) {
      await interaction
        .editReply("You seem to be facing yourself. Have fun? (・へ・)")
        .then(
          setTimeout(
            () =>
              new KumoMatch(
                interaction,
                interaction.options.getUser("opponent"),
                interaction.options.getString("playercolour"),
                interaction.options.getString("opponentcolour")
              )
          ),
          5000
        );
    } else {
      new KumoMatch(
        interaction,
        interaction.options.getUser("opponent"),
        interaction.options.getString("playercolour"),
        interaction.options.getString("opponentcolour")
      );
    }
  },
};
