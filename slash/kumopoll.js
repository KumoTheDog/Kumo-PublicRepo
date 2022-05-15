const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  MessageAttachment,
  MessageEmbed,
  MessageActionRow,
  MessageButton,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kumopoll")
    .setDescription("Create a poll comprising of two responses!")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("The question to put in the poll.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("response1")
        .setDescription("The first valid response.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("response2")
        .setDescription("The second valid response.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("total_responses")
        .setDescription(
          "The total number of users who can respond. Maximum is 49."
        )
        .setRequired(true)
    ),
  timeout: 20000,

  run: async ({ client, interaction }) => {
    if (!interaction.guild) {
      return interaction.editReply("Kumo cannot create a poll within a DM.");
    }

    /**
     * Fetching the responses inputted by the interacting user.
     */
    let question = interaction.options.getString("question");
    let r1 = interaction.options.getString("response1");
    let r2 = interaction.options.getString("response2");
    let threshold = interaction.options.getInteger("total_responses");
    console.log(threshold);
    if (threshold <= 0 || threshold >= 50)
      return interaction.editReply("Invalid total votes. Please try again.");
    if (question.length >= 60 || r1.length >= 60 || r2.length >= 60)
      return interaction.editReply(
        "Invalid structure. Please limit your parameters to 60 characters."
      );

    let embed = new MessageEmbed();
    embed.setTitle(`${question}` + "?");
    embed.setDescription("Status: **Place your votes now!**");
    embed.setColor("#dda15c");
    embed.setThumbnail("attachment://main_logo.png");
    embed.setTimestamp();
    embed.setFooter({
      text: `Created by ${interaction.member.displayName}`,
      iconURL: interaction.member.displayAvatarURL(),
    });

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("b1")
        .setLabel(`Vote for ${r1} (1️⃣)`)
        .setStyle("SECONDARY"),

      new MessageButton()
        .setCustomId("b2")
        .setLabel(`Vote for ${r2} (2️⃣)`)
        .setStyle("SECONDARY"),

      new MessageButton()
        .setCustomId("re")
        .setLabel(`Remove Vote ❌`)
        .setStyle("DANGER")
    );

    await interaction
      .editReply({
        embeds: [embed],
        files: ["./resources/main_logo.png"],
        components: [row],
      })
      .then(async (msg) => {
        const th = threshold;

        async function stop(result) {
          collector.stop();

          const newEmbed = new MessageEmbed(embed);

          newEmbed.title = newEmbed.title + " [CLOSED]";
          newEmbed.setDescription(
            "Status: **Voting is now closed. ((´д｀))**\n" + result
          );
          await msg.edit({ embeds: [newEmbed], components: [] });
        }

        async function update() {
          const newEmbed = new MessageEmbed(embed);

          var userYes = votes["b1"].size === 0 ? "-" : [...votes["b1"]];
          var userNo = votes["b2"].size === 0 ? "-" : [...votes["b2"]];
          const totalVote = [+`${votes["b1"].size}` + +`${votes["b2"].size}`];
          const noPercent = 100 * [`${votes["b2"].size}` / `${totalVote}`] || 0;
          const yesPercent =
            100 * [`${votes["b1"].size}` / `${totalVote}`] || 0;

          newEmbed.addField(`${r1}`, `${userYes}`, true);
          newEmbed.addField(`${r2}`, `${userNo}`, true);
          newEmbed.addField(`${r1}:`, `${yesPercent}%`, false);
          newEmbed.addField(`${r2}:`, `${noPercent}%`, false);
          newEmbed.addField(`Total Votes:`, `${totalVote}/${threshold}`, false);

          await msg.edit({ embeds: [newEmbed] });

          if (votes["b1"].size >= th) {
            await stop(
              `${yesPercent}% of voters chose the first option (${r1}) whereas ${noPercent}% of voters chose the second (${r2}) :)`
            );
            // do something
          } else if (votes["b2"].size >= th) {
            await stop(
              `${yesPercent}% of voters chose the first option (${r1}) whereas ${noPercent}% of voters chose the second (${r2}) :)`
            );
            // do something
          }
        }

        const votes = {
          b1: new Set(),
          b2: new Set(),
        };

        update();

        const collector = msg.createMessageComponentCollector(
          (reaction, user) => user.id !== client.user.id,
          { dispose: true }
        );

        collector.on("collect", async (reaction, user) => {
          if (reaction.customId === "b1") {
            if (votes["b1"].has(reaction.user)) {
              await reaction.reply({
                content: "You have already voted for this response. ( `ε´ )",
                ephemeral: true,
              });
            } else {
              votes["b1"].add(reaction.user);
              votes["b2"].delete(reaction.user);
              await reaction.reply({
                content: `You voted for response 1 (${r1})!`,
                ephemeral: true,
              });
            }
          } else if (reaction.customId === "b2") {
            if (votes["b2"].has(reaction.user)) {
              await reaction.reply({
                content: "You have already voted for this response. ( `ε´ )",
                ephemeral: true,
              });
            } else {
              votes["b2"].add(reaction.user);
              votes["b1"].delete(reaction.user);
              await reaction.reply({
                content: `You voted for response 2 (${r2})!`,
                ephemeral: true,
              });
            }
          } else if (reaction.customId === "re") {
            if (
              !votes["b1"].has(reaction.user) &&
              !votes["b2"].has(reaction.user)
            ) {
              await reaction.reply({
                content: "You have not voted for anything yet. ( `ε´ )",
                ephemeral: true,
              });
            } else {
              votes["b1"].delete(reaction.user);
              votes["b2"].delete(reaction.user);
              await reaction.reply({
                content: `Your vote has been removed...`,
                ephemeral: true,
              });
            }
          }

          update();
        });

        collector.on("remove", (reaction, user) => {
          votes[reaction.customId].delete(reaction.user);

          update();
        });
      })
      .catch(async (e) => {
        console.log("RANDOM DISCORD API ERROR (NON FATAL)" + e);
        await interaction.editReply(
          "Kumo couldn't make a poll this time. Please try again."
        );
        return;
      });
  },
};
