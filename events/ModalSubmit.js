const { MessageEmbed } = require("discord.js");

async function CheckAndGenerateFeedbackModal(
  client,
  interaction,
  feedbackChannel
) {
  //Different logic needed for handling modal responses, need to be defined in a client.on event, rather than in the .js file itself.
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "feedback") {
      const positive = interaction.fields.getTextInputValue("positiveInput");
      const future = interaction.fields.getTextInputValue("futureInput");
      const bug = interaction.fields.getTextInputValue("bugInput");

      if (!positive || !future || !bug) {
        interaction.reply(
          "You seem to have left some responses blank. Please fill them out before submitting your feedback. ((´д｀)) "
        );
        return;
      }
      if (positive.length > 150 || future.length > 150 || bug.length > 150) {
        interaction.reply(
          "It seems that one of your responses exceeds 150 characters. please shorten your responses before submitting your feedback. ((´д｀)) "
        );
        return;
      }

      if (feedbackChannel) {
        console.log(feedbackChannel);
        const feedbackEmbed = new MessageEmbed()
          .setTitle("Kumo Feedback Form recieved!")
          .setThumbnail("attachment://main_logo.png")
          .addField("Sender:", `${interaction.user.username}`)
          .addField("Positive feedback:", `${positive}`)
          .addField("Future plans:", `${future}`)
          .addField("Bugs found:", `${bug}`)
          .setColor("#dda15c")
          .setTimestamp();

        const channel = await client.channels.fetch(feedbackChannel);
        channel.send({
          embeds: [feedbackEmbed],
          files: ["./resources/main_logo.png"],
        });
      } else {
        console.warn(
          "📙: No feedback channel has been specified, feedback will be sent in logs instead."
        );
        console.log("Positive feedback: " + positive);
        console.log("Future plans: " + future);
        console.log("Bugs found: " + bug);
      }
      interaction.reply(
        "Feedback has been sent to the developer. Thanks for using Kumo :)"
      );
    }
  }
}
module.exports = { CheckAndGenerateFeedbackModal };
