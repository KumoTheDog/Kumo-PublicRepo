//Only imports needed for the game are native to discord.js!
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
//Pretty ms used for improved number formatting in the embeds.
const ms = require("pretty-ms");

//Width of game board
const GAMEWIDTH = 9;
//Height of game board
const GAMEHEIGHT = 9;

const database = require("../events/databasehandler");

class KumoMatch {
  //Begin initialising instances of game.
  constructor(interactingUser, opponentUser, p1ColourChoice, p2ColourChoice) {
    //The gameboard is stored as an array, which will soon be turned into a 2d in order to easily fetch specific coordinates of the game.
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
    this.lastCol = null;
    this.lastPlayer = null;
    this.lastPlayerID = null;

    //Turn the initial array into 2D, based on the height and width constants specified at the beginning of the file.
    for (let i = 0; i < GAMEHEIGHT; i++) {
      this.gameArr[i] = [];
      for (let j = 0; j < GAMEWIDTH; j++) {
        this.gameArr[i][j] = "⬜";
      }
    }
    this.createGameBoard(interactingUser);
  }

  //Simple use of switch cases to link an actual colour emoji to each player.
  async choosePlayerColours(interaction, p1Choice, p2Choice) {
    if (p1Choice === p2Choice) {
      await interaction.editReply(
        "It seems that you have chosen an invalid colour choice. Please choose different colours!"
      );
    } else {
      switch (p1Choice) {
        case "r":
          this.p1Colour = "🟥";
          break;
        case "o":
          this.p1Colour = "🟧";
          break;
        case "y":
          this.p1Colour = "🟨";
          break;
        case "g":
          this.p1Colour = "🟩";
          break;
        case "p":
          this.p1Colour = "🟪";
          break;
      }

      switch (p2Choice) {
        case "rO":
          this.p2Colour = "🟥";
          break;
        case "oO":
          this.p2Colour = "🟧";
          break;
        case "yO":
          this.p2Colour = "🟨";
          break;
        case "gO":
          this.p2Colour = "🟩";
          break;
        case "pO":
          this.p2Colour = "🟪";
          break;
      }
    }
  }

  //Render the game array as a string representation which can easily be put into a Discord MessageEmbed.
  gameToString() {
    let str = "| 1️⃣ | 2️⃣ | 3️⃣ | 4️⃣ | 5️⃣ | 6️⃣ | 7️⃣ | 8️⃣ |\n";
    str += "-----------------------------------------\n";
    for (let i = 0; i < GAMEHEIGHT; i++) {
      for (let j = 0; j < GAMEWIDTH; j++) {
        j === GAMEWIDTH - 1
          ? (str += (this.gameArr[i][j] + "|").substring(1))
          : (str += "| " + this.gameArr[i][j] + " ");
      }
      str += "\n";
    }
    return str;
  }

  //Render the game board for initial display to demonstrate to the user how to place chips.
  gameRepresentationToString() {
    let str = "| 1️⃣ | 2️⃣ | 3️⃣ | 4️⃣ | 5️⃣ | 6️⃣ | 7️⃣ | 8️⃣ |\n";
    str += "| ⬇️ | ⬇️ | ⬇️ | ⬇️ | ⬇️ | ⬇️ | ⬇️ | ⬇️ |\n";
    str += "-----------------------------------------\n";
    for (let i = 0; i < GAMEHEIGHT; i++) {
      for (let j = 0; j < GAMEWIDTH; j++) {
        j === GAMEWIDTH - 1
          ? (str += (this.gameArr[i][j] + "|").substring(1))
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
        if (this.gameArr[i][j] === "⬜") {
          return false;
        }
      }
    }
    return true;
  }

  checkRowFull(colNumber) {
    if (this.gameArr[0][colNumber - 1] !== "⬜") {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Sends an epheremal message to the user who clicks the how to play button.
   */
  async gameHowToPlay(reaction) {
    await reaction.reply({
      content:
        "Kumo Match works by matching `5` of your chips in a row, in any orientation across the board. You can win the game by having a line of `5` chips **vertically, horizontally or diagonally** :) ",
      ephemeral: true,
    });
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
   * Generates a new array and edits the message embed, every time a colour in the array is changed.
   */
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
      .setTitle("Kumo Match [ONGOING]")
      .setColor("#dda15c")
      .setDescription(this.gameToString())
      .addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
        `${newTurn}: Awaiting **${newUser}**'s next move.`
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
      cooldownEnd.setTitle("Kumo Match [TIMED OUT]");
      cooldownEnd.fields = [];
      cooldownEnd.addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
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
      fullEmbed.setTitle("Kumo Match [FULL]");
      fullEmbed.fields = [];
      fullEmbed.addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
        "The board is full. No possible moves! No one wins this time."
      );
      await msg.edit({ embeds: [fullEmbed], components: [] });
    } else if (
      //Every time a new turn happens, a quick check O(1) is undertaken to see if there are any winning moves. If yes, the game stops
      //and a winner is clearly defined.
      this.checkIfWon(this.lastArrayPosition, this.lastCol, interaction) ===
      true
    ) {
      clearTimeout(this.gameTimeout);
      const winnerEmbed = new MessageEmbed(editEmbed);
      winnerEmbed.setTitle("Kumo Match [FINISHED]");
      winnerEmbed.fields = [];
      winnerEmbed.addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
        "Game is finished. No more moves can occur!"
      );
      winnerEmbed.addField(
        "Winner:",
        `Congratulations to **${this.lastPlayer}** for winning **Kumo Match**! Hopefully you can keep up your streak...`
      );
      //User plays against themselves so gets less points - very easy for them to win.
      //As Kumo Match is one of the longer games, more points should be awarded.
      if (this.p1ID == this.p2ID) {
        console.log(
          "A player has played kumo match by themselves so gets less points."
        );
        let randPoints = Math.floor(Math.random() * 20) + 2;
        await database.incrementDB(
          this.lastPlayerID,
          randPoints,
          0,
          Date.now()
        );
        winnerEmbed.addField(
          `Leaderboard:`,
          `**${this.lastPlayer}** has chosen to play against themselves, their leaderboard position will increase but by a smaller amount than if they were to play against someone - They gain \`${randPoints}\` points in the *'messages'* category.`
        );
      } else {
        console.log("Two distinct players.");
        //Two distinct players, the winner gets more points.
        let randPoints = Math.floor(Math.random() * 60) + 2;
        await database.incrementDB(
          this.lastPlayerID,
          randPoints,
          0,
          Date.now()
        );
        winnerEmbed.addField(
          `Leaderboard:`,
          `**${this.lastPlayer}** has bested their opponent fair and square and so gains \`${randPoints}\` points in the *'messages'* category.`
        );
      }
      await msg.edit({ embeds: [winnerEmbed], components: [] });
    } else {
      await msg.edit({ embeds: [editEmbed] });
    }
  }

  //Places a chip into a specified column. A for loop goes through the elements corresponding to this column number in the 2D array
  // and places the chip in the next available white space.
  async addPiece(reaction, colNumber, interaction) {
    let chip = this.p1Turn ? this.p1Colour : this.p2Colour;
    for (let i = GAMEHEIGHT - 1; i >= 0; i--) {
      if (this.gameArr[i][colNumber - 1] === "⬜") {
        this.gameArr[i][colNumber - 1] = chip;
        this.lastArrayPosition = i;
        this.lastCol = colNumber - 1;
        if (this.currentPlayer == this.p1ID) {
          this.lastPlayer = this.p1User;
          this.lastPlayerID = this.p1ID;
        } else {
          this.lastPlayer = this.p2User;
          this.lastPlayerID = this.p2ID;
        }
        break;
      } else {
        continue;
      }
    }
  }

  /**
   * Checks the possible winning conditions of a player. Works by using the reference of the last placed piece, then checking
   * if the subsequent 4 chips in ALL directions: Left, right, up , down, NE, SE, NW, SW are equal in any of these ways. If yes, then
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
      if (
        j + 1 < GAMEWIDTH &&
        j + 2 < GAMEWIDTH &&
        j + 3 < GAMEWIDTH &&
        j + 4 < GAMEWIDTH
      ) {
        if (
          this.gameArr[i][j] === this.gameArr[i][j + 1] &&
          this.gameArr[i][j + 1] === this.gameArr[i][j + 2] &&
          this.gameArr[i][j + 2] === this.gameArr[i][j + 3] &&
          this.gameArr[i][j + 3] === this.gameArr[i][j + 4]
        ) {
          check = true;
          break;
        }
      }
      //Left - checks j-1, j-2...
      if (j - 1 >= 0 && j - 2 >= 0 && j - 3 >= 0 && j - 4 >= 0) {
        if (
          this.gameArr[i][j] === this.gameArr[i][j - 1] &&
          this.gameArr[i][j - 1] === this.gameArr[i][j - 2] &&
          this.gameArr[i][j - 2] === this.gameArr[i][j - 3] &&
          this.gameArr[i][j - 3] === this.gameArr[i][j - 4]
        ) {
          check = true;
          break;
        }
      }
      //Up - checks i-1, i-2...
      if (i - 1 >= 0 && i - 2 >= 0 && i - 3 >= 0 && i - 4 >= 0) {
        if (
          this.gameArr[i][j] === this.gameArr[i - 1][j] &&
          this.gameArr[i - 1][j] === this.gameArr[i - 2][j] &&
          this.gameArr[i - 2][j] === this.gameArr[i - 3][j] &&
          this.gameArr[i - 3][j] === this.gameArr[i - 4][j]
        ) {
          check = true;
          break;
        }
      }
      //Down - checks i+1, i+2...
      if (
        i + 1 < GAMEHEIGHT &&
        i + 2 < GAMEHEIGHT &&
        i + 3 < GAMEHEIGHT &&
        i + 4 < GAMEHEIGHT
      ) {
        if (
          this.gameArr[i][j] === this.gameArr[i + 1][j] &&
          this.gameArr[i + 1][j] === this.gameArr[i + 2][j] &&
          this.gameArr[i + 2][j] === this.gameArr[i + 3][j] &&
          this.gameArr[i + 3][j] === this.gameArr[i + 4][j]
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
        j + 2 < GAMEWIDTH &&
        i + 3 < GAMEHEIGHT &&
        j + 3 < GAMEWIDTH &&
        i + 4 < GAMEHEIGHT &&
        j + 4 < GAMEWIDTH
      ) {
        if (
          this.gameArr[i][j] === this.gameArr[i + 1][j + 1] &&
          this.gameArr[i + 1][j + 1] === this.gameArr[i + 2][j + 2] &&
          this.gameArr[i + 2][j + 3] === this.gameArr[i + 3][j + 3] &&
          this.gameArr[i + 3][j + 3] === this.gameArr[i + 4][j + 4]
        ) {
          check = true;
          break;
        }
      }
      //NW Diagonal - checks i-1/j-1, i-2/j-2...
      if (
        i - 1 >= 0 &&
        j - 1 >= 0 &&
        i - 2 >= 0 &&
        j - 2 >= 0 &&
        i - 3 >= 0 &&
        j - 3 >= 0 &&
        i - 4 >= 0 &&
        j - 4 >= 0
      ) {
        if (
          this.gameArr[i][j] === this.gameArr[i - 1][j - 1] &&
          this.gameArr[i - 1][j - 1] === this.gameArr[i - 2][j - 2] &&
          this.gameArr[i - 2][j - 2] === this.gameArr[i - 3][j - 3] &&
          this.gameArr[i - 3][j - 3] === this.gameArr[i - 4][j - 4]
        ) {
          check = true;
          break;
        }
      }
      //NE Diagonal - checks i-1/j+1, i-2,j+2...
      if (
        i - 1 >= 0 &&
        j + 1 < GAMEWIDTH &&
        i - 2 >= 0 &&
        j + 2 < GAMEWIDTH &&
        i - 3 >= 0 &&
        j + 3 < GAMEWIDTH &&
        i - 4 >= 0 &&
        j + 4 < GAMEWIDTH
      ) {
        if (
          this.gameArr[i][j] === this.gameArr[i - 1][j + 1] &&
          this.gameArr[i - 1][j + 1] === this.gameArr[i - 2][j + 2] &&
          this.gameArr[i - 2][j + 2] === this.gameArr[i - 3][j + 3] &&
          this.gameArr[i - 3][j + 3] === this.gameArr[i - 4][j + 4]
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
        j - 2 >= 0 &&
        i + 3 < GAMEHEIGHT &&
        j - 3 >= 0 &&
        i + 4 < GAMEHEIGHT &&
        j - 4 >= 0
      ) {
        if (
          this.gameArr[i][j] === this.gameArr[i + 1][j - 1] &&
          this.gameArr[i + 1][j - 1] === this.gameArr[i + 2][j - 2] &&
          this.gameArr[i + 2][j - 2] === this.gameArr[i + 3][j - 3] &&
          this.gameArr[i + 3][j - 3] === this.gameArr[i + 4][j - 4]
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

  //Create the initial game board, set up the player turns and put the array into the embed.
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

    //Message buttons are prevalent throughout the game - they are the main source of communication.
    await interaction.editReply({ embeds: [introEmbed] }).then(
      setTimeout(async () => {
        const representationEmbed = new MessageEmbed()
          .setTitle("Welcome to Kumo Match!")
          .setColor("#dda15c")
          .setDescription(this.gameRepresentationToString())
          .addField(
            "Game Description:",
            `Match \`5\` of your chips in a row, in any orientation across the board. You win the game by having a line of \`5\` chips **vertically, horizontally or diagonally**. The game will start in \`${ms(
              10000,
              {
                compact: true,
              }
            )}\`!`
          )
          .setTimestamp()
          .setFooter({
            text: `${interaction.member.displayName}`,
            iconURL: interaction.member.displayAvatarURL(),
          });
        await interaction.editReply({ embeds: [representationEmbed] }).then(
          setTimeout(async () => {
            const gameRow = new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId("1")
                .setLabel(`1️⃣`)
                .setStyle("SECONDARY"),

              new MessageButton()
                .setCustomId("2")
                .setLabel(`2️⃣`)
                .setStyle("SECONDARY"),

              new MessageButton()
                .setCustomId("3")
                .setLabel(`3️⃣`)
                .setStyle("SECONDARY"),

              new MessageButton()
                .setCustomId("4")
                .setLabel(`4️⃣`)
                .setStyle("SECONDARY")
            );

            const gameRow2 = new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId("5")
                .setLabel(`5️⃣`)
                .setStyle("SECONDARY"),

              new MessageButton()
                .setCustomId("6")
                .setLabel(`6️⃣`)
                .setStyle("SECONDARY"),

              new MessageButton()
                .setCustomId("7")
                .setLabel(`7️⃣`)
                .setStyle("SECONDARY"),

              new MessageButton()
                .setCustomId("8")
                .setLabel(`8️⃣`)
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
              .setTitle("Kumo Match")
              .setColor("#dda15c")
              .setDescription(this.gameToString())
              .addField(
                "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
                `${String(firstColour)}: Awaiting **${newUser}**'s next move.`
              )
              .setTimestamp()
              .setFooter({
                text: `${interaction.member.displayName}`,
                iconURL: interaction.member.displayAvatarURL(),
              });

            await interaction
              .editReply({
                embeds: [mainGameEmbed],
                components: [gameRow, gameRow2, miscRow],
              })
              .then(async (msg) => {
                console.log(`Sent beginning game board.`);

                //The timeout is initialised once the game board is sent. If no moves occur in the first 30 seconds it is assumed that players are AFK
                //and the game automatically stops.
                //If a move occurs then the timeout of 2 minutes for each move begins.
                this.gameTimeout = setTimeout(async () => {
                  const cooldownEnd = new MessageEmbed(mainGameEmbed);
                  cooldownEnd.setTitle("Kumo Match [TIMED OUT]");
                  cooldownEnd.fields = [];
                  cooldownEnd.addField(
                    "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
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
                //Starts a message collector - each number button should have the same action associated with it, just for a different row.
                collector.on("collect", async (reaction, user) => {
                  if (
                    reaction.customId === "1" ||
                    reaction.customId === "2" ||
                    reaction.customId === "3" ||
                    reaction.customId === "4" ||
                    reaction.customId === "5" ||
                    reaction.customId === "6" ||
                    reaction.customId === "7" ||
                    reaction.customId === "8"
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
                      if (this.checkRowFull(parseInt(reaction.customId))) {
                        await reaction.reply({
                          content:
                            "This column seems to be full. try placing it somewhere else.",
                          ephemeral: true,
                        });
                      } else {
                        this.addPiece(
                          reaction,
                          parseInt(reaction.customId),
                          interaction
                        );
                        this.createNewTurn(interaction, msg);
                        await reaction.deferUpdate();
                      }
                    }
                  } else if (reaction.customId === "htp") {
                    this.gameHowToPlay(reaction);
                  } else if (reaction.customId === "exit") {
                    clearTimeout(this.gameTimeout);
                    this.gameForceQuit(reaction.user.id, reaction, interaction);
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
          }, 10000)
        );
      }, 2000)
    );
  }
}
module.exports = { KumoMatch };
