const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageAttachment,
  MessageEmbed,
  MessageActionRow,
  MessageButton,
} = require("discord.js");
const ms = require("pretty-ms");

const MAXRESPONSE = 30;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kumoratio")
    .setDescription(
      "Start a ratio! Can be directed towards a user or undirected."
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "The user to direct the ratio towards. (Can be yourself :) )"
        )
    ),
  timeout: 120000,

  run: async ({ client, interaction }) => {
    //Users are not able to call ratios in DM channels.
    if (!interaction.guild) {
      await interaction.editReply("You cannot begin a ratio in DM's.");
    }

    //The message displayed in the embed changes depending on who is mentioned (if anyone)
    let ratioedUser = interaction.options.getUser("user");
    let directedUser = "";
    if (ratioedUser) {
      if (ratioedUser.id == client.user.id) {
        //Special phrase if the bot itself is mentioned.
        directedUser = "me?? :(";
      } else {
        //Grammatical changes depending on if the user picks themselves or anyone else.
        ratioedUser.id === interaction.user.id
          ? (directedUser = "themselves!")
          : (directedUser = `${interaction.options.getUser("user").username}!`);
      }
    }

    let embed = new MessageEmbed();

    //IF a user has been mentioned the phrase generated above is chosen. Otherwise, a general ratio starts.
    if (ratioedUser) {
      embed.setTitle(
        `${interaction.member.user.username} has ratioed ${directedUser}`
      );
    } else {
      embed.setTitle(
        `${interaction.member.user.username} has started a ratio!`
      );
    }

    embed.setDescription("**Click the red button to contribute.**");
    embed.setColor("#dda15c");
    embed.setTimestamp();
    embed.setFooter({
      text: "Vote below!",
      iconURL: interaction.member.displayAvatarURL(),
    });

    let button = undefined;

    if (ratioedUser) {
      button = new MessageButton()
        .setCustomId("ratio")
        .setLabel(
          `Help ratio ${interaction.options.getUser("user").username} (｀∀´ )Ψ`
        )
        .setStyle("DANGER");
    } else {
      button = new MessageButton()
        .setCustomId("ratio")
        .setLabel(`Help ratio (｀∀´ )Ψ`)
        .setStyle("DANGER");
    }
    const row = new MessageActionRow().addComponents(button);

    await interaction
      .editReply({
        embeds: [embed],
        components: [row],
      })
      .then(async (msg) => {
        const ratios = new Set();

        //This function is called after the time to vote automatically ends. Limits subsequent votes in order to improve efficiency of the bot.
        async function timeoutEnd(size) {
          collector.stop();

          const finishedEmbed = new MessageEmbed(embed);
          finishedEmbed.title = finishedEmbed.title + " [CLOSED]";
          finishedEmbed.setDescription(`**The time to ratio has run out.**`);

          if (size == 0) {
            finishedEmbed.addField(
              "Count:",
              "0 users have assisted. Looks like it was a failed attempt..."
            );
          } else {
            let finishingMessage = "";
            let plural = "";
            size >= 1 && size <= 6
              ? (finishingMessage = "Could be better... ((´д｀))")
              : (finishingMessage = "Seems successful to me! ( ´ ▽ ` )b");

            size == 1 ? (plural = "user has") : (plural = "users have");
            finishedEmbed.addField(
              "Count:",
              `\`${size}\` ${plural} assisted in the ratio! ${finishingMessage}`
            );
          }

          await msg.edit({ embeds: [finishedEmbed], components: [] });
        }

        //This function is called iff the amount of votes in the ratio exceeds a certain amount - to stop the bot from crashing.
        //Unlikely to happen but still good to code for safety.
        async function maxEnd(size) {
          collector.stop();

          const maxEmbed = new MessageEmbed(embed);
          maxEmbed.title = maxEmbed.title + " [MAX RESPONSES]";
          maxEmbed.setDescription(
            `**Wow! Looks like the max available responses was reached before time ran out.**`
          );
          maxEmbed.addField(
            "Count:",
            `\`${size}\` users have assisted in the ratio! I can't allow more responses. ` +
              "( ´ ▽ ` )b"
          );
          await msg.edit({ embeds: [maxEmbed], components: [] });
        }

        const filter = (reaction, user) => user.id !== client.user.id;
        const collector = msg.createMessageComponentCollector({
          filter,
          time: 30000,
          dispose: true,
        });

        async function update() {
          const newEmbed = new MessageEmbed(embed);

          var totalUsers = ratios.size === 0 ? "-" : [...ratios];

          newEmbed.setDescription(
            embed.description + " Every vote extends the time to help!"
          );

          newEmbed.addField("Users:", `${totalUsers}`, true);

          await msg.edit({ embeds: [newEmbed] });
        }

        update();

        let count = 0;
        collector.on("collect", async (reaction) => {
          if (reaction.customId === "ratio") {
            if (ratios.has(reaction.user)) {
              await reaction.reply({
                content: "You have already contributed to the ratio ( `ε´ )",
                ephemeral: true,
              });
              return;
            } else {
              //Add the reacting user to the set, so they can't vote again.
              ratios.add(reaction.user);
              //Every time a vote occurs the collection timer is reset to its initial 30 seconds AKA extending the time to vote by 30s!
              collector.resetTimer();
              count++;
              //After a predetermined size the bot has to stop allowing votes otherwise it would crash.
              if (count == MAXRESPONSE) {
                maxEnd(count);
                return;
              }
              await reaction.reply({
                content: `You have contributed to the ratio! The timer to vote has been extended by \`${ms(
                  30000,
                  { compact: true }
                )}\`.`,
                ephemeral: true,
              });
            }
          }
          update();
        });

        //After the timer runs out collection stops - any subsequent votes are left out (you would have to start a new ratio.)
        collector.on("end", () => {
          timeoutEnd(count);
        });
      })
      .catch(async (e) => {
        console.log("RANDOM DISCORD API ERROR (NON FATAL)" + e);
        await interaction.editReply(
          "Kumo couldn't start a ratio this time. Please try again."
        );
        return;
      });
  },
};
