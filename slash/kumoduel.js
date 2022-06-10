const { SlashCommandBuilder, time } = require("@discordjs/builders");
const { KumoDuel } = require("../games/kumoduel");
const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kumoduel")
    .setDescription(
      "Challenge an opponent to Kumo Duel! 2 players required. Estimated Play-time: 1-2 minutes."
    )
    .addUserOption((option) =>
      option
        .setName("opponent")
        .setDescription("Your worthy opponent!")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("basehp")
        .setDescription("The base amount of HP, that both players start with.")
        .addChoice("100", 100)
        .addChoice("150", 150)
        .addChoice("200", 200)
        .addChoice("300", 300)
        .setRequired(true)
    ),
  timeout: 1000,

  run: async ({ client, interaction }) => {
    //Game cannot start if you do not call it in an actual guild.
    if (!interaction.guild) {
      await interaction.editReply("You cannot start a game in DM's.");
    }
    //Game cannot start if you choose to face Kumo.
    else if (interaction.options.getUser("opponent").id === client.user.id) {
      await interaction
        .editReply("You can't start the game against me!")
        .then(() => {
          setTimeout(() => interaction.deleteReply(), 5000);
        });
    } else if (
      !interaction.options.getUser("opponent") ||
      interaction.user.id === interaction.options.getUser("opponent").id
    ) {
      await interaction
        .editReply(
          "Kumo duel cannot be played with 1 person. Maybe try a different game if you want to play by yourself?"
        )
        .then(() => {
          setTimeout(() => interaction.deleteReply(), 5000);
        });
    } else {
      //Once all prior checks are satisfied, it is assumed at this point that there are two distinct players to begin the game.
      const confirmEmbed = new MessageEmbed()
        .setTitle("Opponent Confirmation")
        .setDescription(
          `
          **${
            interaction.options.getUser("opponent").username
          }**, you have been challenged to **Kumo Duel!** Are you sure you're prepared? (Initial HP = \`${interaction.options.getNumber(
            "basehp"
          )}\`)`
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
          .setLabel(`Begin duel`)
          .setStyle("SUCCESS"),

        new MessageButton()
          .setCustomId("no")
          .setLabel(`Flee from duel`)
          .setStyle("DANGER")
      );
      await interaction
        .editReply({
          embeds: [confirmEmbed],
          components: [confirmRow],
        })
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
                " has not made a selection in 30 seconds. The duel was automatically cancelled... ((´д｀))"
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
              await new KumoDuel(
                interaction,
                interaction.options.getUser("opponent"),
                interaction.options.getNumber("basehp")
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
                  " fled the duel... ((´д｀))"
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
