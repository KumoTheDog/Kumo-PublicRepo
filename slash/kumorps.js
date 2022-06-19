const { SlashCommandBuilder } = require("@discordjs/builders");
const { KumoRPS } = require("../games/kumorps");
const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");

module.exports = {
  /*
  Sets up command, adds options to specify the opponent.
  */
  data: new SlashCommandBuilder()
    .setName("kumorps")
    .setDescription(
      "Play a game of Kumo RPS! Can be played with 1 or 2 players. Estimated Play-time: 0-1 minute."
    )
    .addUserOption((option) =>
      option
        .setName("opponent")
        .setDescription("Your worthy opponent!")
        .setRequired(false)
    ),
  //Whenever the command is called, a cooldown of 2 minutes is added to stop spam.
  timeout: 120000,

  run: async ({ client, interaction }) => {
    //Game cannot start if you do not call it in an actual guild.
    if (!interaction.guild) {
      await interaction.editReply("You cannot start a game in DM's.");
    }
    //The game WILL start if the opponent you specify is yourself but I think it would be quite boring :).
    //Sends a warning message and initialises the game board after 5 seconds.
    else if (
      !interaction.options.getUser("opponent") ||
      interaction.options.getUser("opponent").id === client.user.id
    ) {
      new KumoRPS(interaction);
    } else if (
      interaction.user.id === interaction.options.getUser("opponent").id
    ) {
      await interaction.editReply(
        "You can't play Kumo RPS against yourself! ((´д｀))"
      );
      //If there is no opponent OR the opponent is chosen to be the bot, the game starts against the bot
    } else {
      //If all the previous checks are satisfied, a new embed is displayed in which the opponent must provide confirmation of the game to begin.
      //Yes and no buttons for the varying choices.
      const confirmEmbed = new MessageEmbed()
        .setTitle("Opponent Confirmation")
        .setDescription(
          `
          **${
            interaction.options.getUser("opponent").username
          }**, would you like to begin a game of **Kumo RPS**?`
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
              msg.edit({ components: [] });
              clearTimeout(afk);
              collector.stop();
              await reaction.deferUpdate();
              new KumoRPS(interaction, interaction.options.getUser("opponent"));
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
                  " didn't feel like playing Kumo RPS... ((´д｀))"
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
