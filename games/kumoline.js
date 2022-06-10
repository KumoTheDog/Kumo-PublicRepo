//Only imports needed for the game are native to discord.js!
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const ms = require("pretty-ms");

//Width of game board
const GAMEWIDTH = 3;
//Height of game board
const GAMEHEIGHT = 3;

/**
 * This game can be considered extremely similar to Kumo Match and thus, to increase code consistency, many functions are taken from that class
 * and refined in a particular way to fit this game.
 */
class KumoLine {
  constructor(interactingUser, opponentUser, p1ColourChoice, p2ColourChoice) {
    //The gameboard, like Kumo Match is stored as an array, which will soon be turned into a 2d in order to easily fetch specific coordinates of the game.
    this.gameArr = [];

    //Random user is chosen when the game is initialised as the starting player. 50/50 chance.
    let rand = Math.floor(Math.random() * 2);
    this.interactingUser = interactingUser;

    //Information fetched about the players passed in through the slash command file.
    this.p1ID = interactingUser.user.id;
    this.p2ID = opponentUser.id;
    this.p1User = interactingUser.user.username;
    this.p2User = opponentUser.username;

    this.p1Colour = null;
    this.p2Colour = null;

    //Separate method for determining player colours
    this.choosePlayerColours(interactingUser, p1ColourChoice, p2ColourChoice);

    this.mainEmbed = null;
    this.inGame = false;
    this.p1Turn = true;
    this.currentPlayer = rand === 0 ? this.p1ID : this.p2ID;
    this.p1Turn = rand === 0 ? this.p1Turn : !this.p1Turn;

    //Used for storing the various timeouts that can take effect over the course of the game.
    this.gameTimeout = null;

    //Reference to the positions in the array as well as the last player - used to determine who placed the winning move.
    this.lastArrayPosition = null;
    //Stores the last known values of i and j to then check if any winning conditions can be determined based on that move.
    this.lastI = null;
    this.lastJ = null;
    this.lastPlayer = null;

    //Turn the initial array into 2D, based on the height and width constants specified at the beginning of the file.
    for (let i = 0; i < GAMEHEIGHT; i++) {
      this.gameArr[i] = [];
      for (let j = 0; j < GAMEWIDTH; j++) {
        this.gameArr[i][j] = "🤍";
      }
    }

    this.createGameBoard(interactingUser);
  }

  //Simple use of switch cases to link an actual colour emoji to each player.
  async choosePlayerColours(interaction, p1Choice, p2Choice) {
    switch (p1Choice) {
      case "r":
        this.p1Colour = "❤️";
        break;
      case "o":
        this.p1Colour = "🧡";
        break;
      case "y":
        this.p1Colour = "💛";
        break;
      case "g":
        this.p1Colour = "💚";
        break;
      case "p":
        this.p1Colour = "💜";
        break;
    }

    switch (p2Choice) {
      case "rO":
        this.p2Colour = "❤️";
        break;
      case "oO":
        this.p2Colour = "🧡";
        break;
      case "yO":
        this.p2Colour = "💛";
        break;
      case "gO":
        this.p2Colour = "💚";
        break;
      case "pO":
        this.p2Colour = "💜";
        break;
    }
  }

  //Render the game array as a string representation which can easily be put into a Discord MessageEmbed.
  gameToString() {
    let str = "";
    for (let i = 0; i < GAMEHEIGHT; i++) {
      for (let j = 0; j < GAMEWIDTH; j++) {
        str += this.gameArr[i][j];
      }
      str += "\n";
    }
    return str;
  }

  //This will be shown as soon as the game starts to allow the players to see where you can place the chips.
  gameRepresentationToString() {
    let str = "| 1️⃣ | 2️⃣ | 3️⃣ |\n";
    for (let i = 0; i < GAMEHEIGHT; i++) {
      if (i == 1) {
        str += "| 4️⃣ | 5️⃣ | 6️⃣ |\n";
      }
      if (i == 2) {
        str += "| 7️⃣ | 8️⃣ | 9️⃣ |\n";
      }
      str += "| ⬇️ | ⬇️ | ⬇️ |\n";
      for (let j = 0; j < GAMEWIDTH; j++) {
        j === GAMEWIDTH - 1
          ? (str += "| " + this.gameArr[i][j] + " |")
          : (str += "| " + this.gameArr[i][j] + " ");
      }
      str += "\n";
    }
    return str;
  }

  checkBoardFull() {
    //If at any point in the array, there is a white square. It means the board is not full and so false. However, if no white squares the board is completely full.
    for (let i = 0; i < GAMEHEIGHT; i++) {
      for (let j = 0; j < GAMEWIDTH - 1; j++) {
        if (this.gameArr[i][j] === "🤍") {
          return false;
        }
      }
    }
    return true;
  }

  checkPositionFull(i, j) {
    return !this.gameArr[i][j] === "🤍";
  }

  /**
   * Deletes the game forcefully and deletes the interaction. Should only be done by the user who called the command.
   */
  async gameForceQuit(reaction, reactionReply, interaction) {
    if (reaction !== this.p1ID) {
      await reactionReply.reply({
        content:
          "You are not the one who started the game. You cannot force quit! ((´д｀))",
        ephemeral: true,
      });
    } else {
      await reactionReply
        .reply(
          "This game has been forcefully quit by the original creator. Looks like there is no clear winner this time. Hope you had fun playing? ((´д｀))"
        )
        .then(() => {
          setTimeout(() => interaction.deleteReply(), 1000);
        });
    }
  }

  /**
   * Sends an epheremal message to the user who clicks the how to play button.
   */
  async gameHowToPlay(reaction) {
    await reaction.reply({
      content:
        "To win Kumo Line, you must outwit your opponent by placing `3` hearts in a line. The order of hearts can go in any direction, including diagonal but it MUST be a line of `3` :) ",
      ephemeral: true,
    });
  }

  async createNewTurn(interaction, msg) {
    this.p1Turn = !this.p1Turn;
    let newTurn = this.p1Turn ? this.p1Colour : this.p2Colour;
    let newUser = this.p1Turn ? this.p1User : this.p2User;
    if (this.p1Turn) {
      this.currentPlayer = this.p1ID;
    } else {
      this.currentPlayer = this.p2ID;
    }
    const editEmbed = new MessageEmbed()
      .setTitle("Kumo Line")
      .setColor("#dda15c")
      .setDescription(this.gameToString())
      .addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა",
        newTurn + ": Awaiting " + newUser + "'s next move."
      )
      .setTimestamp()
      .setFooter({
        text: `${interaction.member.displayName}`,
        iconURL: interaction.member.displayAvatarURL(),
      });
    //Starts the new cooldown with a time limit of 2 minutes. If a new turn hasn't occurred in the last 2 minutes the game is stopped.
    clearTimeout(this.gameTimeout);
    this.gameTimeout = setTimeout(async () => {
      const cooldownEnd = new MessageEmbed(editEmbed);
      cooldownEnd.title = cooldownEnd.title + " [TIMED OUT]";
      cooldownEnd.fields = [];
      cooldownEnd.addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა",
        `No one has played a turn in the last \`${ms(120000, {
          compact: true,
        })}\` - Game has been stopped. ((´д｀))`
      );
      await msg.edit({ embeds: [cooldownEnd], components: [] });
    }, 120000);

    //When a new turn is created, if the board becomes completely full then a draw occurs and no more moves are possible. The game stops.
    if (this.checkBoardFull() === true) {
      clearTimeout(this.gameTimeout);
      const fullEmbed = new MessageEmbed(editEmbed);
      fullEmbed.title = fullEmbed.title + " [FULL]";
      fullEmbed.fields = [];
      fullEmbed.addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა",
        "The board is full. No possible moves! No one wins this time."
      );
      await msg.edit({ embeds: [fullEmbed], components: [] });
    } else if (
      //Every time a new turn happens, a quick check O(1) is undertaken to see if there are any winning moves. If yes, the game stops
      //and a winner is clearly defined.
      this.checkIfWon(this.lastI, this.lastJ, interaction) === true
    ) {
      clearTimeout(this.gameTimeout);
      const winnerEmbed = new MessageEmbed(editEmbed);
      winnerEmbed.title = winnerEmbed.title + " [FINISHED]";
      winnerEmbed.fields = [];
      winnerEmbed.addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა",
        "Game is finished. A winner has been found!"
      );
      winnerEmbed.addField(
        "Winner",
        "Congratulations to " +
          this.lastPlayer +
          " for winning the game! Hopefully you can keep up your streak..."
      );
      await msg.edit({ embeds: [winnerEmbed], components: [] });
    } else {
      await msg.edit({ embeds: [editEmbed] });
    }
  }

  //Add a piece at row i, column j.
  async addPiece(i, j) {
    let chip = this.p1Turn ? this.p1Colour : this.p2Colour;
    if (this.gameArr[i][j] === "🤍") {
      this.gameArr[i][j] = chip;
    }
    this.lastArrayPosition = i;
    this.lastI = i;
    this.lastJ = j;
    if (this.currentPlayer == this.p1ID) {
      this.lastPlayer = this.p1User;
    } else {
      this.lastPlayer = this.p2User;
    }
  }
  /**
   * Checks the possible winning conditions of a player. Works by using the reference of the last placed piece, then checking
   * if the subsequent 2 chips in ALL directions: Left, right, up , down, NE, SE, NW, SW are equal in any of these ways. If yes, then
   * a win happens but if not the game continues.
   *
   * Further checks happen in edge cases for undefined values. If ANY of the subsequent 4 chips are NOT in the range of the game dimensions
   * that winning condition check doesn't occur as it is inevitable that one of these elements would evaluate to "undefined" therefore
   * crashing the game.
   */
  checkIfWon(i, j, interactionToEdit) {
    let check = null;
    while (check === null) {
      //Right - checks j+1,j+2...
      if (j + 1 < GAMEWIDTH && j + 2 < GAMEWIDTH) {
        if (
          this.gameArr[i][j] === this.gameArr[i][j + 1] &&
          this.gameArr[i][j + 1] === this.gameArr[i][j + 2]
        ) {
          check = true;
          break;
        }
      }
      //Left - checks j-1, j-2...
      if (j - 1 >= 0 && j - 2 >= 0) {
        if (
          this.gameArr[i][j] === this.gameArr[i][j - 1] &&
          this.gameArr[i][j - 1] === this.gameArr[i][j - 2]
        ) {
          check = true;
          break;
        }
      }
      //Up - checks i-1, i-2...
      if (i - 1 >= 0 && i - 2 >= 0) {
        if (
          this.gameArr[i][j] === this.gameArr[i - 1][j] &&
          this.gameArr[i - 1][j] === this.gameArr[i - 2][j]
        ) {
          check = true;
          break;
        }
      }
      //Down - checks i+1, i+2...
      if (i + 1 < GAMEHEIGHT && i + 2 < GAMEHEIGHT) {
        if (
          this.gameArr[i][j] === this.gameArr[i + 1][j] &&
          this.gameArr[i + 1][j] === this.gameArr[i + 2][j]
        ) {
          check = true;
          break;
        }
      }
      //SE Diagonal - checks i+1/j+1 , i+2/j+2...
      if (
        i + 1 < GAMEHEIGHT &&
        j + 1 < GAMEWIDTH &&
        i + 2 < GAMEHEIGHT &&
        j + 2 < GAMEWIDTH
      ) {
        if (
          this.gameArr[i][j] === this.gameArr[i + 1][j + 1] &&
          this.gameArr[i + 1][j + 1] === this.gameArr[i + 2][j + 2]
        ) {
          check = true;
          break;
        }
      }
      //NW Diagonal - checks i-1/j-1, i-2/j-2...
      if (i - 1 >= 0 && j - 1 >= 0 && i - 2 >= 0 && j - 2 >= 0) {
        if (
          this.gameArr[i][j] === this.gameArr[i - 1][j - 1] &&
          this.gameArr[i - 1][j - 1] === this.gameArr[i - 2][j - 2]
        ) {
          check = true;
          break;
        }
      }
      //NE Diagonal - checks i-1/j+1, i-2,j+2...
      if (i - 1 >= 0 && j + 1 < GAMEWIDTH && i - 2 >= 0 && j + 2 < GAMEWIDTH) {
        if (
          this.gameArr[i][j] === this.gameArr[i - 1][j + 1] &&
          this.gameArr[i - 1][j + 1] === this.gameArr[i - 2][j + 2]
        ) {
          check = true;
          break;
        }
      }
      //SW Diagonal - checks i+1/j-1 , i+2/j-2...
      if (
        i + 1 < GAMEHEIGHT &&
        j - 1 >= 0 &&
        i + 2 < GAMEHEIGHT &&
        j - 2 >= 0
      ) {
        if (
          this.gameArr[i][j] === this.gameArr[i + 1][j - 1] &&
          this.gameArr[i + 1][j - 1] === this.gameArr[i + 2][j - 2]
        ) {
          check = true;
          break;
        }
      }
      check = false;
      break;
    }
    return check;
  }

  async createGameBoard(interaction) {
    let newUser = this.p1Turn ? this.p1User : this.p2User;
    let firstColour;
    if (this.p1Turn) {
      firstColour = this.p1Colour;
    } else {
      firstColour = this.p2Colour;
    }

    const introEmbed = new MessageEmbed()
      .setTitle("Setting up game...")
      .setDescription(
        `By random selection, the first move belongs to **${newUser}**. Please wait for the game to be initialised...`
      )
      .setColor("RED");

    await interaction.editReply({ embeds: [introEmbed] }).then(
      setTimeout(async () => {
        const gameRepresentationEmbed = new MessageEmbed()
          .setTitle("Welcome to Kumo Line!")
          .setColor("#dda15c")
          .addField(
            "Game Description",
            `Match \`3\` hearts in a **line** to win. The numbers pointing down to each heart correspond to the **position** in which you can place it. The game will start in \`${ms(
              10000,
              {
                compact: true,
              }
            )}\`!`
          )
          .setDescription(this.gameRepresentationToString())
          .setTimestamp()
          .setFooter({
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
              let newUser = this.p1Turn ? this.p1User : this.p2User;
              let firstColour;
              if (this.p1Turn) {
                firstColour = this.p1Colour;
              } else {
                firstColour = this.p2Colour;
              }

              const gameRow = new MessageActionRow().addComponents(
                new MessageButton()
                  .setCustomId("00")
                  .setLabel(`1️⃣`)
                  .setStyle("SECONDARY"),

                new MessageButton()
                  .setCustomId("01")
                  .setLabel(`2️⃣`)
                  .setStyle("SECONDARY"),

                new MessageButton()
                  .setCustomId("02")
                  .setLabel(`3️⃣`)
                  .setStyle("SECONDARY")
              );

              const gameRow2 = new MessageActionRow().addComponents(
                new MessageButton()
                  .setCustomId("10")
                  .setLabel(`4️⃣`)
                  .setStyle("SECONDARY"),

                new MessageButton()
                  .setCustomId("11")
                  .setLabel(`5️⃣`)
                  .setStyle("SECONDARY"),

                new MessageButton()
                  .setCustomId("12")
                  .setLabel(`6️⃣`)
                  .setStyle("SECONDARY")
              );

              const gameRow3 = new MessageActionRow().addComponents(
                new MessageButton()
                  .setCustomId("20")
                  .setLabel(`7️⃣`)
                  .setStyle("SECONDARY"),

                new MessageButton()
                  .setCustomId("21")
                  .setLabel(`8️⃣`)
                  .setStyle("SECONDARY"),

                new MessageButton()
                  .setCustomId("22")
                  .setLabel(`9️⃣`)
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

              const mainGameEmbed = new MessageEmbed()
                .setTitle("Kumo Line")
                .setColor("#dda15c")
                .setDescription(this.gameToString())
                .addField(
                  "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა",
                  String(firstColour) +
                    ": Awaiting " +
                    newUser +
                    "'s next move."
                )
                .setTimestamp()
                .setFooter({
                  text: `${interaction.member.displayName}`,
                  iconURL: interaction.member.displayAvatarURL(),
                });
              await interaction
                .editReply({
                  embeds: [mainGameEmbed],
                  components: [gameRow, gameRow2, gameRow3, miscRow],
                })
                .then(async (msg) => {
                  console.log(`Sent beginning game board.`);

                  //The timeout is initialised once the game board is sent. If no moves occur in the first 30 seconds it is assumed that players are AFK
                  //and the game automatically stops.
                  //If a move occurs then the timeout of 2 minutes for each move begins.
                  this.gameTimeout = setTimeout(async () => {
                    const cooldownEnd = new MessageEmbed(mainGameEmbed);
                    cooldownEnd.title = cooldownEnd.title + " [TIMED OUT]";
                    cooldownEnd.fields = [];
                    cooldownEnd.addField(
                      "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა",
                      `The game has begun, but no one played a turn for \`${ms(
                        30000,
                        { compact: true }
                      )}\` - Game has been stopped. ((´д｀))`
                    );

                    await msg.edit({ embeds: [cooldownEnd], components: [] });
                  }, 30000);

                  const collector = msg.createMessageComponentCollector(
                    (reaction, user) => user.id !== client.user.id,
                    { dispose: true }
                  );

                  collector.on("collect", async (reaction, user) => {
                    if (
                      //The reaction IDs are saved in this way to allow easy retrieval of array positions by parsing the ints found in the string.
                      reaction.customId === "00" ||
                      reaction.customId === "01" ||
                      reaction.customId === "02" ||
                      reaction.customId === "10" ||
                      reaction.customId === "11" ||
                      reaction.customId === "12" ||
                      reaction.customId === "20" ||
                      reaction.customId === "21" ||
                      reaction.customId === "22"
                    ) {
                      if (
                        reaction.user.id !== this.currentPlayer &&
                        (reaction.user.id === this.p1ID ||
                          reaction.user.id === this.p2ID)
                      ) {
                        await reaction.reply({
                          content: "Please wait for your turn!",
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
                        if (
                          this.checkPositionFull(
                            parseInt(reaction.customId.charAt(0)),
                            parseInt(reaction.customId.charAt(1))
                          )
                        ) {
                          await reaction.reply({
                            content:
                              "This position seems to be full. Try placing it somewhere else.",
                            ephemeral: true,
                          });
                        } else {
                          this.addPiece(
                            parseInt(reaction.customId.charAt(0)),
                            parseInt(reaction.customId.charAt(1))
                          );
                          if (reaction.customId === "00") {
                            gameRow.components[0].setDisabled(true);
                            await msg.edit({
                              components: [
                                gameRow,
                                gameRow2,
                                gameRow3,
                                miscRow,
                              ],
                            });
                          } else if (reaction.customId === "01") {
                            gameRow.components[1].setDisabled(true);

                            await msg.edit({
                              components: [
                                gameRow,
                                gameRow2,
                                gameRow3,
                                miscRow,
                              ],
                            });
                          } else if (reaction.customId === "02") {
                            gameRow.components[2].setDisabled(true);
                            await msg.edit({
                              components: [
                                gameRow,
                                gameRow2,
                                gameRow3,
                                miscRow,
                              ],
                            });
                          } else if (reaction.customId === "10") {
                            gameRow2.components[0].setDisabled(true);
                            await msg.edit({
                              components: [
                                gameRow,
                                gameRow2,
                                gameRow3,
                                miscRow,
                              ],
                            });
                          } else if (reaction.customId === "11") {
                            gameRow2.components[1].setDisabled(true);
                            await msg.edit({
                              components: [
                                gameRow,
                                gameRow2,
                                gameRow3,
                                miscRow,
                              ],
                            });
                          } else if (reaction.customId === "12") {
                            gameRow2.components[2].setDisabled(true);
                            await msg.edit({
                              components: [
                                gameRow,
                                gameRow2,
                                gameRow3,
                                miscRow,
                              ],
                            });
                          } else if (reaction.customId === "20") {
                            gameRow3.components[0].setDisabled(true);
                            await msg.edit({
                              components: [
                                gameRow,
                                gameRow2,
                                gameRow3,
                                miscRow,
                              ],
                            });
                          } else if (reaction.customId === "21") {
                            gameRow3.components[1].setDisabled(true);
                            await msg.edit({
                              components: [
                                gameRow,
                                gameRow2,
                                gameRow3,
                                miscRow,
                              ],
                            });
                          } else if (reaction.customId === "22") {
                            gameRow3.components[2].setDisabled(true);
                            await msg.edit({
                              components: [
                                gameRow,
                                gameRow2,
                                gameRow3,
                                miscRow,
                              ],
                            });
                          }
                          this.createNewTurn(interaction, msg);
                          await reaction.deferUpdate();
                        }
                      }
                    } else if (reaction.customId === "htp") {
                      this.gameHowToPlay(reaction);
                    } else if (reaction.customId === "exit") {
                      clearTimeout(this.gameTimeout);
                      this.gameForceQuit(
                        reaction.user.id,
                        reaction,
                        interaction
                      );
                    }
                  });
                })
                .catch(async (e) => {
                  console.log("RANDOM DISCORD API ERROR (NON FATAL)" + e);
                  await interaction.editReply(
                    "Kumo couldn't start the game this time. Please try again."
                  );
                  return;
                });
            }, 10000);
          });
      }, 2000)
    );
  }
}

module.exports = { KumoLine };
