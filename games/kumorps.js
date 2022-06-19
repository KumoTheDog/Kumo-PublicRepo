const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const ms = require("pretty-ms");

const RESPONSES = ["Scissors ✂", "Paper 📰", "Rock 🗻"];

class KumoRPS {
  constructor(interactingUser, opponentUser = null) {
    this.p1User = interactingUser;
    this.p2User = opponentUser;
    this.startingTime = new Date().toLocaleString();

    //Information fetched about the players passed in through the slash command file.
    this.p1ID = interactingUser.user.id;
    this.p1User = interactingUser.user.username;
    //Player 2 information defaults to null unless a parameter is passed into opponentUser.
    this.p2ID = null;
    this.p2User = null;
    if (opponentUser != null) {
      this.p2ID = opponentUser.id;
      this.p2User = opponentUser.username;
    }
    //Boolean to indicate whether to play against a bot or a human.
    opponentUser == null
      ? this.playGame(true, interactingUser)
      : this.playGame(false, interactingUser);

    this.gameTimeout = null;
    //Player responses are saved into a variable to easily access when needed in a string.
    this.p1Response = null;
    this.p2Response = null;

    //Current player always starts at p1 and remains that way unless the turn is passed over during human play.
    this.currentPlayer = this.p1ID;
    this.currentPlayerUser = this.p1User;
    this.lastPlayer = null;
  }

  //Returns a demonstration of the game, so users can easily understand how to play.
  gameRepresentationToString() {
    return `• ✂ beats 📰 **BUT** loses against 🗻.\n• 📰 beats 🗻 **BUT** loses against ✂.\n• 🗻 beats ✂ **BUT** loses against 📰.\n`;
  }

  //Sends an ephemeral message indicating how to play the game if the user clicks the corresponding button.
  async gameHowToPlay(reaction) {
    await reaction.reply({
      content: `**Kumo RPS** is played by selecting the correct symbol relative to your opponent. However, you won't know what your opponent has selected until you have **both chosen**.\nThere are \`3\` symbols to pick - *rock (🗻)*, *scissors (✂)* and *paper (📰)*.\n As stated in the initial demonstration:\n ${this.gameRepresentationToString()}`,
      ephemeral: true,
    });
  }

  //Force quits the game, deleting the main embed. Only the user who called the game has the ability to force quit.
  async gameForceQuit(reaction, reactionReply, interaction) {
    //Stops any users whose ID doesn't match the player 1 ID.
    clearTimeout(this.gameTimeout);
    if (reaction !== this.p1ID) {
      await reactionReply.reply({
        content:
          "You are not the one who started **Kumo RPS**. You cannot force quit! ((´д｀))",
        ephemeral: true,
      });
    } else {
      await reactionReply
        .reply(
          "This matchup has been forcefully quit by the original caller. Looks like there is no clear winner this time. Hope you had fun playing and hope you play again? ((´д｀))"
        )
        .then(() => {
          setTimeout(() => interaction.deleteReply(), 500);
        });
    }
  }

  //Updates embed for the differing turns. Provides a user friendly way to check who has currently responded.
  async updateEmbed(p1HasResponded, p2HasResponded, msg, interaction) {
    const updateEmbed = new MessageEmbed();
    updateEmbed.setTitle("Kumo Duel [ONGOING]");
    updateEmbed.setColor("#dda15c");
    let p1Status = `Awaiting **${this.p1User}'s** selection.`;
    let p2Status = `Awaiting **${this.p2User}'s** selection.`;
    if (p1HasResponded) {
      p1Status = `**${this.p1User}** has confirmed their selection...`;
    }
    if (p2HasResponded) {
      p2Status = `**${this.p2User}** has confirmed their selection...`;
    }

    updateEmbed.addField(`${this.p1User}'s selection:`, p1Status, true);
    updateEmbed.addField(`${this.p2User}'s selection:`, p2Status, true);
    if (!(p1HasResponded && p2HasResponded)) {
      updateEmbed.addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
        `Waiting for **${this.currentPlayerUser}** to choose their selection!`
      );
    }

    updateEmbed.setTimestamp();
    updateEmbed.setFooter({
      text: `${interaction.member.displayName}`,
      iconURL: interaction.member.displayAvatarURL(),
    });
    if (p1HasResponded && p2HasResponded) {
      updateEmbed.setDescription(
        "***Both players have responded***. Currently calculating *winner*..."
      );
      await msg.edit({ embeds: [updateEmbed], components: [] });
    } else {
      await msg.edit({ embeds: [updateEmbed] });
    }
  }
  //Winner and loser are usernames. responses are string.
  //Generates a winner embed, ending the game. Quite reusable as it can also be interpreted as a LOSERs embed.
  winningEmbed(winner, loser, winnerResponse, loserResponse, msg, interaction) {
    clearTimeout(this.gameTimeout);
    const winnerEmbed = new MessageEmbed();
    winnerEmbed.setColor("#dda15c");
    winnerEmbed.setDescription(
      `Congrats to **${winner}** for beating **${loser}** in this *legendary* matchup!\n Hopefully it wasn't luck... Play again to find out!\nRPS played at \`${this.startingTime}\` （‐＾▽＾‐）`
    );
    winnerEmbed.setTitle(`Kumo RPS [FINISHED]`);
    winnerEmbed.addField(
      `${winner}'s response:`,
      `**${winnerResponse}**`,
      true
    );
    winnerEmbed.addField(`${loser}'s response:`, `**${loserResponse}**`, true);
    winnerEmbed.setTimestamp();
    winnerEmbed.setFooter({
      text: `${interaction.member.displayName}`,
      iconURL: interaction.member.displayAvatarURL(),
    });

    msg.edit({ embeds: [winnerEmbed], components: [] });
  }

  //Sends a 'draw' embed in the case that both players select the same symbol.
  drawEmbed(drawResponse, msg, interaction, player1User, player2User) {
    clearTimeout(this.gameTimeout);
    const drawEmbed = new MessageEmbed();
    drawEmbed.setColor("#dda15c");
    drawEmbed.setTitle("Kumo RPS [DRAW]");
    drawEmbed.setDescription(
      `Seems that both players, **${player1User}** and **${player2User}** chose **${drawResponse}**.\n Great minds think alike but you always have the option to play again!\nRPS played at \`${this.startingTime}\` （‐＾▽＾‐）`
    );
    drawEmbed.setTimestamp();
    drawEmbed.setFooter({
      text: `${interaction.member.displayName}`,
      iconURL: interaction.member.displayAvatarURL(),
    });

    msg.edit({ embeds: [drawEmbed], components: [] });
  }

  /**
   * Begin playing the main game.
   */
  async playGame(isBot, interaction) {
    let kumoResponse = null;
    const gameRepresentationEmbed = new MessageEmbed()
      .setTitle("Welcome to Kumo RPS!")
      .setColor("#dda15c");
    if (isBot) {
      kumoResponse = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
      gameRepresentationEmbed.addField(
        "Game Description:",
        `Choose the correct symbol to win the bout. You have the ability to choose between ***rock***, ***paper*** or ***scissors***.\nAs you are facing me, only you will have the option to choose your selection. The game will begin in \`${ms(
          10000,
          {
            compact: true,
          }
        )}\`!`
      );
    } else {
      gameRepresentationEmbed.addField(
        "Game Description:",
        `Choose the correct symbol to win the bout. You have the ability to choose between ***rock***, ***paper*** or ***scissors***.\nOnce the game begins, you two will take turns choosing your selection - the player who called the game (**${
          this.p1User
        }**) shall go first. The game will begin in \`${ms(10000, {
          compact: true,
        })}\`!`
      );
    }
    gameRepresentationEmbed.setDescription(this.gameRepresentationToString());
    gameRepresentationEmbed.setTimestamp();
    gameRepresentationEmbed.setFooter({
      text: `${interaction.member.displayName}`,
      iconURL: interaction.member.displayAvatarURL(),
    });

    await interaction
      .editReply({
        embeds: [gameRepresentationEmbed],
        components: [],
      })
      .then(async () => {
        setTimeout(async () => {
          const selectionRow = new MessageActionRow().addComponents(
            new MessageButton()
              .setCustomId("r")
              .setLabel(`Rock`)
              .setEmoji("🗻")
              .setStyle("SECONDARY"),

            new MessageButton()
              .setCustomId("p")
              .setLabel(`Paper`)
              .setEmoji("📰")
              .setStyle("SECONDARY"),

            new MessageButton()
              .setCustomId("s")
              .setLabel(`Scissors`)
              .setEmoji("✂")
              .setStyle("SECONDARY")
          );

          const miscRow = new MessageActionRow().addComponents(
            new MessageButton()
              .setCustomId("htp")
              .setLabel(`How to Play 💬`)
              .setStyle("SUCCESS"),

            new MessageButton()
              .setCustomId("exit")
              .setLabel(`Quit Game ❌`)
              .setStyle("DANGER")
          );

          //Main embed, all relevant user information will be shown here.
          const mainGameEmbed = new MessageEmbed();
          mainGameEmbed.setTitle("Kumo RPS");
          mainGameEmbed.setColor("#dda15c");
          if (isBot) {
            mainGameEmbed.addField(
              "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
              `Waiting for **${this.p1User}** to choose their selection!`
            );
          } else {
            mainGameEmbed.addField(
              `${this.p1User}'s selection:`,
              `Awaiting **${this.p1User}**'s selection.`,
              true
            );
            mainGameEmbed.addField(
              `${this.p2User}'s selection:`,
              `Awaiting **${this.p2User}**'s selection.`,
              true
            );
            mainGameEmbed.addField(
              "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
              `Waiting for **${this.currentPlayerUser}** to choose their selection!`
            );
          }
          mainGameEmbed.setTimestamp();
          mainGameEmbed.setFooter({
            text: `${interaction.member.displayName}`,
            iconURL: interaction.member.displayAvatarURL(),
          });

          //Sends the main embed alongside the initialised buttons.
          await interaction
            .editReply({
              embeds: [mainGameEmbed],
              components: [selectionRow, miscRow],
            })
            .then(async (msg) => {
              const collector = msg.createMessageComponentCollector(
                (reaction, user) => user.id !== client.user.id,
                { dispose: true }
              );

              //Sets up the game timeout. In this specific game, it is assumed that BOTH users shall make their selection within 2 minutes.
              //Otherwise, the game shall end and be treated as 'abandoned'.
              this.gameTimeout = setTimeout(async () => {
                collector.stop();
                const cooldownEnd = new MessageEmbed(mainGameEmbed);
                cooldownEnd.title = cooldownEnd.title + " [TIMED OUT]";
                cooldownEnd.fields = [];
                if (isBot) {
                  cooldownEnd.addField(
                    "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
                    `**${this.p1User}** has not selected their choice in \`${ms(
                      120000,
                      {
                        compact: true,
                      }
                    )}\` - Game has been stopped. ((´д｀))`
                  );
                } else {
                  cooldownEnd.addField(
                    "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
                    `Players have not selected their choice in \`${ms(120000, {
                      compact: true,
                    })}\` - Game has been stopped. ((´д｀))`
                  );
                }
                await msg.edit({ embeds: [cooldownEnd], components: [] });
              }, 120000);

              //Main collector to recieve button interactions.
              collector.on("collect", async (reaction, user) => {
                //Htp and exit call their specific methods.
                if (reaction.customId === "htp") {
                  this.gameHowToPlay(reaction);
                } else if (reaction.customId === "exit") {
                  this.gameForceQuit(reaction.user.id, reaction, interaction);
                } else if (
                  reaction.customId === "r" ||
                  reaction.customId === "p" ||
                  reaction.customId === "s"
                ) {
                  if (isBot) {
                    //Playing against bot...
                    if (reaction.user.id !== this.p1ID) {
                      await reaction.reply({
                        content:
                          "It seems you are not part of this game. Please stop interfering!",
                        ephemeral: true,
                      });
                    } else {
                      //Check for player response and compare it to the response generated by kumo.
                      switch (reaction.customId) {
                        case "s":
                          this.p1Response = "Scissors ✂";
                          break;
                        case "p":
                          this.p1Response = "Paper 📰";
                          break;

                        case "r":
                          this.p1Response = "Rock 🗻";
                          break;
                      }
                      if (
                        (reaction.customId === "r" &&
                          kumoResponse === "Scissors ✂") ||
                        (reaction.customId === "p" &&
                          kumoResponse === "Rock 🗻") ||
                        (reaction.customId === "s" &&
                          kumoResponse === "Paper 📰")
                      ) {
                        //User has won against Kumo.
                        collector.stop();
                        this.winningEmbed(
                          this.p1User,
                          "Kumo",
                          this.p1Response,
                          kumoResponse,
                          msg,
                          interaction
                        );
                      } else if (this.p1Response === kumoResponse) {
                        collector.stop();
                        //Draw
                        this.drawEmbed(
                          this.p1Response,
                          msg,
                          interaction,
                          this.p1User,
                          "Kumo"
                        );
                      } else {
                        collector.stop();
                        //User has not won against Kumo.
                        this.winningEmbed(
                          "Kumo",
                          this.p1User,
                          kumoResponse,
                          this.p1Response,
                          msg,
                          interaction
                        );
                      }
                    }
                  } else {
                    //Playing against human...Rather than sending embed messages, you can collect responses from players one at a time by disabling buttons in the main channel. p1 then p2.
                    if (
                      reaction.user.id !== this.currentPlayer &&
                      (reaction.user.id === this.p1ID ||
                        reaction.user.id === this.p2ID)
                    ) {
                      await reaction.reply({
                        content: "You can't click anything at the moment...",
                        ephemeral: true,
                      });
                    } else if (
                      reaction.user.id !== this.p1ID &&
                      reaction.user.id !== this.p2ID
                    ) {
                      await reaction.reply({
                        content:
                          "It seems you are not part of this game. Please stop interfering!",
                        ephemeral: true,
                      });
                    } else {
                      //Current player at this point is p1.
                      if (this.currentPlayer === this.p1ID) {
                        this.lastPlayer = this.currentPlayer;
                        this.currentPlayer = this.p2ID;
                        this.currentPlayerUser = this.p2User;
                        switch (reaction.customId) {
                          case "s":
                            this.p1Response = "Scissors ✂";
                            break;
                          case "p":
                            this.p1Response = "Paper 📰";
                            break;

                          case "r":
                            this.p1Response = "Rock 🗻";
                            break;
                        }
                        await this.updateEmbed(true, false, msg, interaction);
                        await reaction.deferUpdate();
                      }
                      //Player 2 goes AFTER player 1, meaning both have responded and THEREFORE, a winner can be determined.
                      else if (
                        this.currentPlayer === this.p2ID &&
                        this.lastPlayer === this.p1ID
                      ) {
                        switch (reaction.customId) {
                          case "s":
                            this.p2Response = "Scissors ✂";
                            break;
                          case "p":
                            this.p2Response = "Paper 📰";
                            break;

                          case "r":
                            this.p2Response = "Rock 🗻";
                            break;
                        }
                        await reaction.deferUpdate();
                        this.updateEmbed(true, true, msg, interaction).then(
                          () => {
                            setTimeout(() => {
                              //Under these conditions, p1 would win against p2. However, if this doesn't satisfy, then there is either
                              //a draw or p2 wins.
                              if (
                                (this.p1Response === "Scissors ✂" &&
                                  this.p2Response === "Paper 📰") ||
                                (this.p1Response === "Paper 📰" &&
                                  this.p2Response === "Rock 🗻") ||
                                (this.p1Response === "Rock 🗻" &&
                                  this.p2Response === "Scissors ✂")
                              ) {
                                collector.stop();
                                //P1 wins.
                                this.winningEmbed(
                                  this.p1User,
                                  this.p2User,
                                  this.p1Response,
                                  this.p2Response,
                                  msg,
                                  interaction
                                );
                              } else if (this.p1Response === this.p2Response) {
                                collector.stop();
                                //draw
                                this.drawEmbed(
                                  this.p1Response,
                                  msg,
                                  interaction,
                                  this.p1User,
                                  this.p2User
                                );
                              } else {
                                collector.stop();
                                //p2 wins

                                this.winningEmbed(
                                  this.p2User,
                                  this.p1User,
                                  this.p2Response,
                                  this.p1Response,
                                  msg,
                                  interaction
                                );
                              }
                            }, 3000);
                          }
                        );
                      }
                    }
                  }
                }
              });
            });
        }, 10000);
      });
  }
}

module.exports = { KumoRPS };
