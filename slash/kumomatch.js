const { SlashCommandBuilder } = require("@discordjs/builders");
const { KumoMatch } = require("../games/kumomatch");
const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");

module.exports = {
  /*
  Sets up command, adds options to specify the opponent as well as the colours for you and the opponent.
  Colours are red, orange, yellow, green and purple.
  */
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
  //Whenever the command is called, a cooldown of 2 minutes is added to stop spam.
  timeout: 120000,

  run: async ({ client, interaction }) => {
    //Game cannot start if you do not call it in an actual guild.
    if (!interaction.guild) {
      await interaction.editReply("You cannot start a game in DM's.");
    }
    //Game cannot start if you choose to face Kumo.
    if (interaction.options.getUser("opponent").id === client.user.id) {
      await interaction.editReply("You can't start the game against me!");
    }
    //Game cannot start if two matching colours are chosen, to avoid confusion.
    else if (
      interaction.options.getString("playercolour") ===
      interaction.options.getString("opponentcolour").substring(0, 1)
    ) {
      await interaction.editReply(
        "It seems you have chosen the same colours. Please choose separate colours for you and the opponent. ((´д｀))"
      );
    }
    //The game WILL start if the opponent you specify is yourself but I think it would be quite boring :).
    //Sends a warning message and initialises the game board after 5 seconds.
    else if (
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
      //If all the previous checks are satisfied, a new embed is displayed in which the opponent must provide confirmation of the game to begin.
      //Yes and no buttons for the varying choices.
      const confirmEmbed = new MessageEmbed()
        .setTitle("Opponent Confirmation")
        .setDescription(
          interaction.options.getUser("opponent").username +
            ", are you sure you want to begin?"
        )
        .setColor("#dda15c")
        .setTimestamp()
        .setFooter({
          text: `Challenged by ${interaction.member.displayName}`,
          iconURL: interaction.member.displayAvatarURL(),
        });
      const confirmRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("yes")
          .setLabel(`Yes`)
          .setStyle("SUCCESS"),

        new MessageButton().setCustomId("no").setLabel(`No`).setStyle("DANGER")
      );
      await interaction
        .editReply({ embeds: [confirmEmbed], components: [confirmRow] })
        .then(async (msg) => {
          const collector = msg.createMessageComponentCollector(
            (reaction, user) => user.id !== client.user.id,
            { dispose: true }
          );

          //Once the embed is sent a cooldown begins, allowing 30 seconds for the opponent to make their selection. If no action has occurred
          //in that timeframe, the game simply will not start.
          afk = setTimeout(async () => {
            const cooldownEnd = new MessageEmbed(confirmEmbed);
            cooldownEnd.title = cooldownEnd.title + " [TIMED OUT]";
            cooldownEnd.fields = [];
            cooldownEnd.setDescription(
              interaction.options.getUser("opponent").username +
                " has not made a selection in 30 seconds. The game was automatically cancelled... ((´д｀))"
            );
            await msg
              .edit({ embeds: [cooldownEnd], components: [] })
              .then(() => {
                setTimeout(() => interaction.deleteReply(), 10000);
              });
          }, 30000);

          //Collector is started to record the interactions with the buttons as well as to check who it is interacting with them.
          collector.on("collect", async (reaction, user) => {
            //Stops unwanted users from clicking the buttons - only the opponent should have this ability.
            if (
              reaction.user.id !== interaction.options.getUser("opponent").id
            ) {
              await reaction.reply({
                content: "You cannot pick for the opponent!",
                ephemeral: true,
              });
              //If the opponent chooses yes, reaction collection is stopped, the timeout defined previously is stopped and the game can now begin!
            } else if (
              reaction.customId === "yes" &&
              reaction.user.id === interaction.options.getUser("opponent").id
            ) {
              await msg.edit({ components: [] });
              clearTimeout(afk);
              collector.stop();
              await reaction.deferUpdate();
              new KumoMatch(
                interaction,
                interaction.options.getUser("opponent"),
                interaction.options.getString("playercolour"),
                interaction.options.getString("opponentcolour")
              );
              //However, if the opponent chooses the no button, the game does not start and is deleted, as if nothing happened :(
            } else if (
              reaction.customId === "no" &&
              reaction.user.id === interaction.options.getUser("opponent").id
            ) {
              clearTimeout(afk);
              collector.stop();
              const noEmbed = new MessageEmbed(confirmEmbed);
              noEmbed.fields = [];
              noEmbed.setDescription(
                interaction.options.getUser("opponent").username +
                  " didn't feel like playing Kumo Match... ((´д｀))"
              );
              await msg.edit({ embeds: [noEmbed], components: [] }).then(() => {
                setTimeout(() => interaction.deleteReply(), 3000);
              });
              await reaction.deferUpdate();
            }
          });
        });
    }
  },
};
