//Initial game notes found below :) :

//Turn based fighting game with items. The items could be defined either in an array OR a json file.
//At the beginning of the game, 2 items are randomly chosen from the list, 2 different selections for the 2 opponents.

//During the game, there should be the option to generically fight, which randomly deducts an amount of hp from the opponent
//OR miss (doing 0 damage),
//Items which allow you to select one of the two items you have in your inventory then either: fight immediately after OR
//skip a turn and use the item another time.

//There should also be a button to flee, which can be clicked by either one of the opponents, automatically giving the win.

//All main information should be displayed on an embed which both players can see.

//They can see user updates through ephemeral messages and interaction.reply

//Perhaps at the end of the game, there can be a log file of ALL moves played during the game,
// which is saved to an arrayList (AKA an empty array, then use .push() for infinite amounts).

//Add custom responses with a json file.

const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const itemEntities = require("../items/itemEntities");
const responses = require("../resources/duelresponses.json");
const ms = require("pretty-ms");
const database = require("../events/databasehandler");

class KumoDuel {
  constructor(interactingUser, opponentUser, hpAmount) {
    //50% chance to determine who goes first.
    let rand = Math.floor(Math.random() * 2);
    this.interactingUser = interactingUser;
    this.opponentUser = opponentUser;
    //P1 is the interacting user and p2 is the opponent!
    this.hpAmountP1 = this.hpAmountP2 = this.startingHp = hpAmount;

    //Date for start of duel to put in log file.
    this.startingTime = new Date().toLocaleString();

    //Inventories of both the players, represented by use of arrays.
    this.interactingUserItems = [];
    this.opponentUserItems = [];

    this.mainEmbed = null;

    //Information fetched about the players passed in through the slash command file.
    this.p1ID = interactingUser.user.id;
    this.p2ID = opponentUser.id;
    this.p1User = interactingUser.user.username;
    this.p2User = opponentUser.username;

    //Turn based logic.
    this.p1Turn = true;
    this.currentPlayer = rand === 0 ? this.p1ID : this.p2ID;
    this.p1Turn = rand === 0 ? this.p1Turn : !this.p1Turn;

    //Turn counts:
    //Total turns as well as individual user turns.
    this.p1TurnCount = 0;
    this.p2TurnCount = 0;
    this.turns = 0;

    //Reference to the last acting player.
    this.lastPlayer = null;
    this.lastPlayerID = null;

    //Easy reference to the names of the 2 items in both player inventories.
    this.firstItemNameP1 = null;
    this.secondItemNameP1 = null;
    this.firstItemNameP2 = null;
    this.secondItemNameP2 = null;

    //Boolean for determining if it should be harder for a user to hit.
    this.highEvasion = false;

    //Used for storing the various timeouts that can take effect over the course of the game.
    this.gameTimeout = null;

    //Array to store the phrases in string form and output it at the end of the game if wanted.
    this.logFileArray = [];

    this.distributeItems(
      itemEntities.fetchGameItems(),
      this.interactingUserItems,
      this.opponentUserItems
    );

    this.createMainEmbed(interactingUser);
  }

  distributeItems(itemArray, p1Inventory, p2Inventory) {
    //Perform a pop action 4 times, 2 for each player therefore adding 2 items to each player inventory.
    //The player CAN have 2 of the same items but that isn't a bad thing!

    p1Inventory.push(itemArray[Math.floor(Math.random() * itemArray.length)]);
    p1Inventory.push(itemArray[Math.floor(Math.random() * itemArray.length)]);
    p2Inventory.push(itemArray[Math.floor(Math.random() * itemArray.length)]);
    p2Inventory.push(itemArray[Math.floor(Math.random() * itemArray.length)]);

    this.firstItemNameP1 = this.interactingUserItems[0].getName();
    this.secondItemNameP1 = this.interactingUserItems[1].getName();
    this.firstItemNameP2 = this.opponentUserItems[0].getName();
    this.secondItemNameP2 = this.opponentUserItems[1].getName();
  }

  async checkItems(reaction, interaction, msg, userChecking) {
    //Initial Problem: Having buttons in an ephemeral embed. FOR BYPASSING AKA fighting THEN using a button we can check if the id IS = the last player. If it isnt it is still the
    //intended player turn but if it is the player just went so shouldn't be able to use the buttons.
    //Check for the user who reacted then display the items that they could use in an ephemeral embed.

    let itemOne = "";
    let itemTwo = "";
    if (this.p1Turn) {
      //Player 1 turn, get their items and show it to them.
      itemOne = this.interactingUserItems[0];
      itemTwo = this.interactingUserItems[1];
    } else {
      //Player 2 turn, get their items and show it to them.
      itemOne = this.opponentUserItems[0];
      itemTwo = this.opponentUserItems[1];
    }
    //Display the info inside an embed.
    const itemEmbed = new MessageEmbed()
      .setTitle("Duel Inventory")
      .setColor("#dda15c")
      .setTimestamp()
      .setDescription(
        "At the start of the duel, you have been given `2` items. Here is what you have available! ૮ ˶ᵔ ᵕ ᵔ˶ ა"
      );
    //Items are held in array indexes - if the item is removed that index is considered undefined.
    //Therefore, there is no point having that field present.
    if (itemOne != undefined) {
      itemEmbed.addField(
        "First Item:",
        `**${itemOne.getName()}**\n• ${itemOne.getDescription()}\n• Perk: ${itemOne.getBuff()}`
      );
    }
    if (itemTwo != undefined) {
      itemEmbed.addField(
        "Second Item:",
        `**${itemTwo.getName()}**\n• ${itemTwo.getDescription()}\n• Perk: ${itemTwo.getBuff()}`
      );
    }
    //If both items have been used a different embed is sent with NO fields.
    if (itemOne == undefined && itemTwo == undefined) {
      itemEmbed.setTitle("Duel Inventory [EMPTY]");
      itemEmbed.setDescription(
        "You have run out of available items to use! ((´д｀))"
      );
    }
    await reaction.reply({
      embeds: [itemEmbed],
      ephemeral: true,
    });
  }

  //Increases turn counters.
  increaseTurns(player) {
    this.turns++;
    if (player == this.p1User) {
      this.p1TurnCount++;
    } else {
      this.p2TurnCount++;
    }
  }

  //Perhaps the logic for the item usage can go into this method. Determine what item was used and then create logic for what happens for those items.
  useItem(reaction, interaction, msg, userChecking, i, username) {
    if (userChecking == this.p1ID) {
      if (this.interactingUserItems[i] !== undefined) {
        console.log(`Player 1 used item at index ${i}.`);
        this.determinePerk(
          this.interactingUserItems[i].useItem(),
          reaction,
          msg,
          interaction,
          username,
          userChecking
        );
        //Once the user consumes an item in the slot it should be set to undefined.
        this.interactingUserItems[i] = undefined;
      } else {
        reaction.reply({
          content: "You don't seem to have an item in that slot...",
          ephemeral: true,
        });
        return;
      }
    } else {
      if (this.opponentUserItems[i] !== undefined) {
        console.log(`Player 2 used item at index ${i}.`);
        this.determinePerk(
          this.opponentUserItems[i].useItem(),
          reaction,
          msg,
          interaction,
          username,
          userChecking
        );
        //Same for the opponent.
        this.opponentUserItems[i] = undefined;
      } else {
        reaction.reply({
          content: "You don't seem to have an item in that slot...",
          ephemeral: true,
        });
        return;
      }
    }
  }

  //Generates a new turn, provides updates to the main embed.
  createNewTurn(interaction, msg) {
    this.p1Turn = !this.p1Turn;
    let newUser = this.p1Turn ? this.p1User : this.p2User;
    if (this.p1Turn) {
      this.currentPlayer = this.p1ID;
    } else {
      this.currentPlayer = this.p2ID;
    }
    const editEmbed = new MessageEmbed()
      .setTitle("Kumo Duel [ONGOING]")
      .setColor("#dda15c")

      .addField(`${this.p1User}'s HP:`, `\`${this.hpAmountP1}\` HP remaining.`)

      .addField(`${this.p2User}'s HP:`, `\`${this.hpAmountP2}\` HP remaining.`)

      .addField(
        `Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა (Turn \`${this.turns + 1}\`):`,
        `Awaiting **${newUser}**'s next action.`
      )

      .setTimestamp()
      .setFooter({
        text: `Called by ${interaction.member.displayName}`,
        iconURL: interaction.member.displayAvatarURL(),
      });
    //Starts the new cooldown with a time limit of 2 minutes. If a new turn hasn't occurred in the last 2 minutes the game is stopped.
    clearTimeout(this.gameTimeout);
    this.gameTimeout = setTimeout(async () => {
      const cooldownEnd = new MessageEmbed(editEmbed);
      cooldownEnd.setTitle("Kumo Duel [TIMED OUT]");
      cooldownEnd.fields = [];

      cooldownEnd.addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
        `No one has played a turn in the last \`${ms(120000, {
          compact: true,
        })}\` - Game has been stopped. ((´д｀))`
      );

      msg.edit({
        embeds: [cooldownEnd],
        components: [],
      });
    }, 120000);

    //First checks if there is a winning condition AKA one of the players
    if (this.checkWinningCondition(this.hpAmountP1, this.hpAmountP2) === true) {
      clearTimeout(this.gameTimeout);
      const winnerEmbed = new MessageEmbed(editEmbed);
      winnerEmbed.title = winnerEmbed.title + " [FINISHED]";
      winnerEmbed.fields = [];
      //The last player has to be the one who wins if they hit the other user to 0hp.
      winnerEmbed.addField(
        "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
        `The duel has ceased. **${this.lastPlayer}** has dealt the knockout blow.`
      );

      winnerEmbed.addField(
        "Winner:",
        `Congratulations to **${this.lastPlayer}** for winning Kumo Duel! You are the (temporary) **master of duels**! ▨-▨¬ლ(•_•) (▨_▨¬)`
      );

      let randPoints = Math.floor(Math.random() * 70) + 2;
      console.log(
        "Player has won Kumo Duel. Their leaderboard score is incremented."
      );
      winnerEmbed.addField(
        `Leaderboard:`,
        `**${this.lastPlayer}** has bested their opponent fair and square and so gains \`${randPoints}\` points in the *'messages'* category.`
      );

      const logRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("logs")
          .setLabel("View fight logs")
          .setStyle("SECONDARY")
      );

      //Creates a message action row which adds a duel history log button.
      //Anyone can click it - they have until a minute after the duel ends. Once clicked, they can view
      //miscellaneous stats about the overall duel,
      //including turns taken (by each user), items for each user as well as a transcript of how the duel played out.
      //Sent as an ephemeral message to avoid spam.

      msg
        .edit({
          embeds: [winnerEmbed],
          components: [logRow],
        })
        .then(async (msg) => {
          console.log(`A kumo duel has finished.`);

          database.incrementDB(this.lastPlayerID, randPoints, 0, Date.now());

          const collector = msg.createMessageComponentCollector({
            time: 60000,
            dispose: true,
          });

          collector.on("collect", async (reaction, user) => {
            if (reaction.customId === "logs") {
              this.generateLogEmbed(reaction);
            }
          });

          collector.on("end", () => {
            collector.stop();
            msg.edit({
              embeds: [winnerEmbed],
              components: [],
            });
          });
        });
    } else {
      msg.edit({ embeds: [editEmbed] });
    }
  }

  checkWinningCondition(p1HP, p2HP) {
    //Someone HAS won the game if at any point, the hp of either player has reached 0.
    let win = false;
    p1HP <= 0 || p2HP <= 0 ? (win = true) : (win = false);
    return win;
  }

  //Reduce a player hp by a set amount.
  async deductHP(player, amount) {
    player = player - amount;
  }

  generateRandomResponse(arr) {
    //In this scenario, we can assert that every element in the array HAS to be a string.
    return arr[Math.floor(Math.random() * arr.length)];
  }

  //Made miss probability

  //Fight the opponent. Deducts hp randomly. Has a 1/3 chance to miss and 2/3 to hit.
  //There is also an evasionProbability, which is fixed at 1 until someone uses an item which can trigger this.highEvasion...
  //Then, there is a 70% chance that the opposing user will miss their turn.
  fight(
    interaction,
    damageBuff = 0,
    customWrittenResponse = "",
    multiply = false,
    multiplyAmount = 0
  ) {
    //Base amount is deducted and 0 is added if no damage buff is specified (mainly to do with the use of items.)
    let amountDeducted = Math.floor(Math.random() * 60) + 1 + damageBuff;
    let evasionProb = 1;
    if (multiply) {
      amountDeducted = Math.round((amountDeducted *= multiplyAmount));
    }
    if (this.highEvasion) {
      evasionProb = Math.random();
    }
    this.turns++;
    let hitProbability = Math.floor(Math.random * 15);
    //If a number generated is less than 5 the user misses, doing 0 damage. Their turn is skipped.
    if (hitProbability < 5 || evasionProb <= 0.7) {
      this.highEvasion = false;
      let playerMissed = "";
      //P1 misses
      if (this.p1Turn) {
        this.p1TurnCount++;
        this.lastPlayer = this.p1User;
        this.lastPlayerID = this.p1ID;
        playerMissed = this.p1User;
      } else {
        //P2 misses
        this.p2TurnCount++;
        this.lastPlayer = this.p2User;
        this.lastPlayerID = this.p2ID;
        playerMissed = this.p2User;
      }
      let missedResponse = `**${playerMissed}** ${this.generateRandomResponse(
        responses.noDamageResponse
      )}`;
      this.addToLogs(missedResponse);
      interaction.reply(missedResponse).then(() => {
        setTimeout(() => interaction.deleteReply(), 3000);
      });
    } else {
      this.highEvasion = false;
      let playerAttacking = "";
      let playerHit = "";
      let hitHP = null;
      if (this.p1Turn) {
        this.p1TurnCount++;
        //Reply with a random phrase and deduct hp
        //Player 1 deducts hp from player 2
        this.hpAmountP2 -= amountDeducted;
        if (this.hpAmountP2 <= 0) {
          this.hpAmountP2 = 0;
        }
        this.lastPlayer = this.p1User;
        this.lastPlayerID = this.p1ID;

        playerAttacking = this.p1User;
        playerHit = this.p2User;
        hitHP = this.hpAmountP2;
      } else {
        //P2 hits, deducts HP from p1.
        this.p2TurnCount++;
        this.hpAmountP1 -= amountDeducted;
        if (this.hpAmountP1 <= 0) {
          this.hpAmountP1 = 0;
        }
        this.lastPlayer = this.p2User;
        this.lastPlayerID = this.p2ID;

        playerAttacking = this.p2User;
        playerHit = this.p1User;
        hitHP = this.hpAmountP1;
      }

      //Structure is: User does damage. Other user has x hp. Fill with custom resposnes.
      let response = "";
      customWrittenResponse == ""
        ? (response = `**${playerAttacking}** ${this.generateRandomResponse(
            responses.actionResponses
          )} \`${amountDeducted}\` ${this.generateRandomResponse(
            responses.damageResponses
          )}. **${playerHit}** has \`${hitHP}\` HP ${this.generateRandomResponse(
            responses.otherPlayerResponses
          )} \n`)
        : (response = `${customWrittenResponse} \`${amountDeducted}\` damage. **${playerHit}** is left with \`${hitHP}\` HP.\n`);
      this.addToLogs(response);
      interaction.reply(response).then(() => {
        setTimeout(() => interaction.deleteReply(), 6000);
      });
    }
    //After the values of hp changed, the main embed should get updated.
  }

  //Adds a string to the generated log transcript, alongside the specific turn number.
  async addToLogs(stringToAdd) {
    let message = stringToAdd;
    if (stringToAdd.length >= 1020) {
      message = stringToAdd.substring(0, 1000) + "...";
    }
    this.logFileArray.push(`**Turn** \`${this.turns}\`: ${message}`);
  }

  //Gets a reference to the current log transcript.
  getLogArray() {
    return this.logFileArray;
  }

  //Flee the duel AKA ends it.
  //Produces different messages depending on who leaves the duel.
  async flee(reaction, reactionReply, interaction) {
    if (reaction === this.p1ID) {
      await reactionReply
        .reply({
          content: `**${this.p1User}** chose to flee the duel. Seems like ${this.p2User} wins through forfeit ((´д｀))`,
        })
        .then(() => {
          setTimeout(() => interaction.deleteReply(), 1000);
        });
    } else if (reaction === this.p2ID) {
      await reactionReply
        .reply({
          content: `**${this.p2User}** chose to flee the duel. Seems like ${this.p1User} wins through forfeit ((´д｀))`,
        })
        .then(() => {
          setTimeout(() => interaction.deleteReply(), 1000);
        });
    } else {
      await reactionReply.reply({
        content:
          "You are not part of the duel. You cannot quit for the players! ((´д｀))",
        ephemeral: true,
      });
    }
  }

  //Creates the log embed and sends it to the user.
  generateLogEmbed(reactionReply) {
    const logEmbed = new MessageEmbed()
      .setTitle("Kumo Duel Logs")

      .addField(
        "Duel Info:",
        `• Duel played between **${this.p1User}** (player 1) and **${this.p2User}** (player 2) at **${this.startingTime}**.\n• **${this.p1User}** was the user who initiated the duel.\n• ${this.lastPlayer} won, dealing the fatal blow for \`0\` HP.\n• Both players started with \`${this.startingHp}\` HP.\n`
      )

      .addField(
        "Turn Info:",
        `• The duel took \`${this.turns}\` turns for a winner to emerge.\n• **${this.p1User}** performed \`${this.p1TurnCount}\` of these turns while **${this.p2User}** took \`${this.p2TurnCount}\`.`
      )

      .addField(
        "Items:",
        `In their inventories, **${this.p1User}** had **'${this.firstItemNameP1}'** & **'${this.secondItemNameP1}'** and **${this.p2User}** had **'${this.firstItemNameP2}'** & **'${this.secondItemNameP2}'**`
      )

      .setTimestamp()
      .setColor("#dda15c");

    //FOR LOOP to create multiple fields - discord has the limitation that a field cannot contain more than 1024 characters.
    //So multiple fields have to be created.
    //Synchronous - conditions have to be checked one after the other.
    let characterCounter = 0;
    let logStr = "";

    for (let i = 0; i < this.logFileArray.length; i++) {
      characterCounter += this.logFileArray[i].length;
      logStr += this.logFileArray[i];
      //If the end of the array is reached and the character count < 1024, make a single field labelled 'transcript'
      if (i == this.logFileArray.length - 1 && characterCounter < 1024) {
        logEmbed.addField("Transcript:", logStr);
        break;
      }
      if (characterCounter + this.logFileArray[i].length >= 1000) {
        logEmbed.addField("Transcript:", logStr);
        //Field embed is reset to make space for a new field (fields can't have more than 1024 characters.)
        characterCounter = 0;
        logStr = "";
      }
    }

    reactionReply.reply({
      embeds: [logEmbed],
      components: [],
      ephemeral: true,
    });
  }

  //Logic for the various items which the user can interact with throughout the lifetime of the duel.
  //For convienience, all items can be updated here.
  async determinePerk(item, reaction, msg, interaction, username, userID) {
    switch (item) {
      case "laptop":
        this.increaseTurns(username);
        let hackerProbability = Math.random();
        if (hackerProbability <= 0.1) {
          clearTimeout(this.gameTimeout);
          //END THE GAME - the opponent has been hacked.
          this.lastPlayer = username;
          let hackMessage = `**${username}**, through the use of **'Hacker's Laptop'**, has nullified any further attempts at a turn, automatically winning the duel through **computational skill.**\n`;
          this.addToLogs(hackMessage);
          const hackedEmbed = new MessageEmbed()
            .setTitle(`D̵̛̤̯̼̞́͒̅̈́U̷͔͙̘͍̇́̋̂͌̃̋E̵͍̠͒͒̒̊̒̽̄Ĺ̵̛̛̤͇͇̼̮͖̓̾̂͝ ̴̥̘̼͉̯͊H̷̢͚͈͇̬̲̩͆A̸̤͍̠͚͔͐̈̐͆̑C̶̝̗̤̀̀̆̍̓K̷͉̻̜̼͕͛̿̌̓̒̕͝E̴̥̺͂͋͘D̷͚̥̪͓͙̀`)
            .setColor("#dda15c")
            .setDescription(hackMessage)
            .addField(
              "Leaderboard:",
              `**${username}** feels like giving themselves \`70\` points in the *'messages'* category. Because they can!`
            );
          console.log(
            "Player has won Kumo Duel through hacking. Their leaderboard score is incremented."
          );
          await database.incrementDB(userID, 70, 0, Date.now());

          //If the duel is hacked you still have the option to view log files.
          //The log file can only be viewed upon winning OR hack, not if the game times out (treated as abandoned.)
          const logRow = new MessageActionRow().addComponents(
            new MessageButton()
              .setCustomId("logs")
              .setLabel("View fight logs")
              .setStyle("SECONDARY")
          );
          interaction
            .editReply({
              embeds: [hackedEmbed],
              components: [logRow],
            })
            .then((msg) => {
              const collector = msg.createMessageComponentCollector({
                time: 60000,
                dispose: true,
              });

              collector.on("collect", async (reaction, user) => {
                if (reaction.customId === "logs") {
                  this.generateLogEmbed(reaction);
                }
              });

              collector.on("end", () => {
                collector.stop();
                msg.edit({
                  embeds: [hackedEmbed],
                  components: [],
                });
              });
              return;
            });
        } else {
          //Most of the time, the user will miss the hacker laptop, so the game should just continue.
          const hackedFailed = `**${username}** uses **'Hacker's Laptop'**... Looks like the hack attempt was unsuccessful this time.\n`;
          this.addToLogs(hackedFailed);
          reaction
            .reply({
              content: hackedFailed,
            })
            .then(() => {
              setTimeout(() => reaction.deleteReply(), 6000);
            });
          this.createNewTurn(interaction, msg);
        }
        break;
      case "apple":
        //Red Apple gives a flat increase of 60 HP, no RNG. Guaranteed to restore HP.
        const appleMessage = `**${username}** uses **'Red Apple'**. It was delightfully scrumptious, restoring \`60\` HP.\n`;
        this.increaseTurns(username);
        this.addToLogs(appleMessage);
        if (username == this.p1User) {
          this.hpAmountP1 += 60;
        } else {
          this.hpAmountP2 += 60;
        }
        reaction
          .reply({
            content: appleMessage,
          })
          .then(() => {
            setTimeout(() => reaction.deleteReply(), 6000);
          });
        this.createNewTurn(interaction, msg);
        break;
      case "jam":
        //Blackcurrant jam restores HP at a variable rate (based on RNG)
        //It could be worse gains than the Red Apple or better, it is up to luck.
        let hpGain = 0;
        let percentageIncrease = (Math.random() * (0.6 - 0.1) + 0.1).toFixed(2);
        let strPercent = percentageIncrease.toString().substring(2) + "%";
        let overallHP = null;
        if ((username = this.p1User)) {
          hpGain = Math.round(this.hpAmountP1 * percentageIncrease);
          this.hpAmountP1 += hpGain;
          overallHP = this.hpAmountP1;
        } else {
          hpGain = Math.round(this.hpAmountP2 * percentageIncrease);
          this.hpAmountP2 += hpGain;
          overallHP = this.hpAmountP2;
        }
        const jamMessage = `**${username}** uses **'Blackcurrant Jam'**. **${username}** can sense their HP growing by \`${strPercent}\` (gaining \`${hpGain}\` HP), leading to a total of \`${overallHP}\` HP.\n`;
        this.increaseTurns(username);
        this.addToLogs(jamMessage);
        reaction
          .reply({
            content: jamMessage,
          })
          .then(() => {
            setTimeout(() => reaction.deleteReply(), 6000);
          });
        this.createNewTurn(interaction, msg);
        break;

      //KEEP IN MIND that using these items still gives a 1/3 chance to miss the attack completely!
      case "wallet":
        //Coin-filled wallet is an attacking item - it combines with your base attack and is guaranteed to increase it at a variable rate.
        //Could be better or worse than the broom.
        //Amount of pennies is randomly generated...And added to the base attack
        let pennies = Math.floor(Math.random() * 60) + 1;
        let walletResponse = `**${username}** uses **'Coin-Filled Wallet'**. ${pennies} coins were found inside! **${username}** successfully duels with the coins, dealing a total of `;
        this.fight(reaction, pennies, walletResponse);
        this.createNewTurn(interaction, msg);
        //Don't need to add to logs here, fight method automatically does it for us.
        break;

      case "broom":
        //Simply increases base attack by 30%. Still determined by RNG but that just concerns the attacking logic.
        let broomResponse = `**${username}** uses **'Brown Broom'**. A surge of power radiates around **${username}**, providing a \`30%\` damage buff - this connects for `;
        //Flat rate of 1.3 AKA 30% applied.
        //Don't need to add to logs here, fight method automatically does it for us.
        this.fight(reaction, null, broomResponse, true, 1.3);
        this.createNewTurn(interaction, msg);
        break;

      //For the cloak, they can miss but the cloak will still be put on, which increases evasiveness by 70% for the opponent.
      case "cloak":
        let cloakResponse = `**${username}** uses **'Shadow Cloak'**. The cloak is worn, allowing **${username}** to attack once then disappear into the shadows - the opponent has a \`70%\` chance of missing their next move. **${username}** deals `;
        //Don't need to add to logs here, fight method automatically does it for us.
        this.fight(reaction, null, cloakResponse, false, 0);
        this.highEvasion = true;
        this.createNewTurn(interaction, msg);
        break;

      //All current items are finished.
      //If more were to be added they could go here.
    }
  }

  //Logic for the introductory and the main embed.
  async createMainEmbed(interaction) {
    let newUser = this.p1Turn ? this.p1User : this.p2User;

    const introEmbed = new MessageEmbed()
      .setTitle("Setting up game...")
      .setDescription(
        `By random selection, the first move belongs to **${newUser}**. Please wait for the game to be initialised...`
      )
      .setColor("RED");

    await interaction.editReply({ embeds: [introEmbed] }).then(
      setTimeout(async () => {
        //Somewhat of a demonstration embed, teaching users what to expect when they play the game.
        const representationEmbed = new MessageEmbed()
          .setTitle("Welcome to Kumo Duel!")
          .setColor("#dda15c")

          .setDescription(
            `Get ready for this monumental clash between **${this.p1User}** and **${this.p2User}** on **${this.startingTime}**.`
          )

          .addField(
            "Game Description:",
            `Outsmart your opponent by having a duel to the finish! Both of you start with \`${this.hpAmountP1}\` HP. The first user to get the other to \`0\` wins! The duel will begin **shortly**.`
          )

          .addField(
            "Items:",
            "Both of you have been granted `2` items, which can be used during your turns. Click **'view items'** to find out which items are in your inventory, as well as the outcome of using them. Please note that the **timeout** (discussed below ⬇️) is still in effect as you look at your items."
          )

          .addField(
            "Log File:",
            "During the game, a **log file** is constantly being updated. When a winner emerges, this log file will be made available for `1` minute - feel free to click on it and check out the duel history!"
          )

          .addField(
            "Timeouts:",
            `The starting player has \`${ms(30000, {
              compact: true,
            })}\` to make their first move, which then transforms into a \`${ms(
              120000,
              { compact: true }
            )}\` timer for both players. If a timeout occurs, the duel is treated as **abandoned** and therefore concludes as a **draw**. In this case, **no leaderboard points** are awarded to anyone.`
          )

          .setTimestamp()
          .setFooter({
            text: `Called by ${interaction.member.displayName}`,
            iconURL: interaction.member.displayAvatarURL(),
          });
        await interaction.editReply({ embeds: [representationEmbed] }).then(
          setTimeout(async () => {
            const actionRow = new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId("fi")
                .setLabel("Fight (｀∀´ )Ψ")
                .setStyle("DANGER"),

              new MessageButton()
                .setCustomId("item")
                .setLabel("View items")
                .setEmoji("📄")
                .setStyle("SECONDARY"),

              new MessageButton()
                .setCustomId("flee")
                .setLabel("Flee ..・ヾ(。＞＜)シ")
                .setStyle("PRIMARY")
            );

            const usageRow = new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId("iOne")
                .setLabel(`Use item in slot 1 (ಠ◡ಠ)`)
                .setStyle("SECONDARY"),

              new MessageButton()
                .setCustomId("iTwo")
                .setLabel(`Use item in slot 2 (ಠ◡ಠ)`)
                .setStyle("SECONDARY")
            );
            const mainGameEmbed = new MessageEmbed()
              .setTitle("Welcome to Kumo Duel!")
              .setColor("#dda15c")

              .addField(
                `${this.p1User}'s HP:`,
                `\`${this.hpAmountP1}\` HP remaining.`
              )

              .addField(
                `${this.p2User}'s HP:`,
                `\`${this.hpAmountP2}\` HP remaining.`
              )

              .addField(
                `Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა (Turn \`${this.turns + 1}\`):`,
                `Awaiting **${newUser}**'s next action.`
              )

              .setTimestamp()
              .setFooter({
                text: `Called by ${interaction.member.displayName}`,
                iconURL: interaction.member.displayAvatarURL(),
              });

            await interaction
              .editReply({
                embeds: [mainGameEmbed],
                components: [actionRow, usageRow],
              })
              .then(async (msg) => {
                //The timeout is initialised once the game board is sent. If no moves occur in the first 30 seconds it is assumed that players are AFK
                //and the game automatically stops.
                //If a move occurs then the timeout of 2 minutes for each move begins.
                this.gameTimeout = setTimeout(async () => {
                  const cooldownEnd = new MessageEmbed(mainGameEmbed);
                  cooldownEnd.title = cooldownEnd.title + " [TIMED OUT]";
                  cooldownEnd.fields = [];
                  cooldownEnd.addField(
                    "Current Turn ૮ ˶ᵔ ᵕ ᵔ˶ ა:",
                    `The game has begun, but no one played a turn for \`${ms(
                      30000,
                      { compact: true }
                    )}\`- Game has been stopped. ((´д｀))`
                  );
                  await msg.edit({
                    embeds: [cooldownEnd],
                    components: [],
                  });
                }, 30000);

                const collector = msg.createMessageComponentCollector(
                  (reaction, user) => user.id !== client.user.id,
                  { dispose: true }
                );

                collector.on("collect", async (reaction, user) => {
                  if (reaction.customId === "fi") {
                    if (
                      reaction.user.id !== this.currentPlayer &&
                      (reaction.user.id === this.p1ID ||
                        reaction.user.id === this.p2ID)
                    ) {
                      await reaction.reply({
                        content:
                          "You seem to be quite aggressive. Please wait for your turn before fighting! ((´д｀))",
                        ephemeral: true,
                      });
                    } else if (
                      reaction.user.id !== this.p1ID &&
                      reaction.user.id !== this.p2ID
                    ) {
                      await reaction.reply({
                        content:
                          "It seems you are not part of this duel. You have the chance to duel one of these users after their match! ((´д｀))",
                        ephemeral: true,
                      });
                    } else {
                      this.fight(reaction);
                      this.createNewTurn(interaction, msg);
                    }
                  } else if (reaction.customId === "item") {
                    if (
                      reaction.user.id !== this.currentPlayer &&
                      (reaction.user.id === this.p1ID ||
                        reaction.user.id === this.p2ID)
                    ) {
                      await reaction.reply({
                        content:
                          "Please wait - you can view your items once it is your turn! ((´д｀))",
                        ephemeral: true,
                      });
                    } else if (
                      reaction.user.id !== this.p1ID &&
                      reaction.user.id !== this.p2ID
                    ) {
                      await reaction.reply({
                        content:
                          "It seems you are not part of this duel. You can see what items were given to you if you start your own duel. ((´д｀))",
                        ephemeral: true,
                      });
                    } else {
                      await this.checkItems(
                        reaction,
                        interaction,
                        msg,
                        reaction.user.username
                      );
                    }
                  } else if (reaction.customId === "flee") {
                    if (
                      reaction.user.id !== this.currentPlayer &&
                      (reaction.user.id === this.p1ID ||
                        reaction.user.id === this.p2ID)
                    ) {
                      await reaction.reply({
                        content:
                          "If you are certain that you want to flee from the duel, you can do it on your turn...",
                        ephemeral: true,
                      });
                    } else if (
                      reaction.user.id !== this.p1ID &&
                      reaction.user.id !== this.p2ID
                    ) {
                      await reaction.reply({
                        content:
                          "It seems you are not part of this game. What are you running away from? ((´д｀))",
                        ephemeral: true,
                      });
                    } else {
                      collector.stop();
                      await this.flee(reaction.user.id, reaction, interaction);
                    }
                  } else if (reaction.customId === "iOne") {
                    if (
                      reaction.user.id !== this.currentPlayer &&
                      (reaction.user.id === this.p1ID ||
                        reaction.user.id === this.p2ID)
                    ) {
                      await reaction.reply({
                        content:
                          "You have the chance to use your items once it is your turn! ((´д｀))",
                        ephemeral: true,
                      });
                    } else if (
                      reaction.user.id !== this.p1ID &&
                      reaction.user.id !== this.p2ID
                    ) {
                      await reaction.reply({
                        content:
                          "It seems you are not part of this game. You can't use these items! ((´д｀))",
                        ephemeral: true,
                      });
                    } else {
                      this.useItem(
                        reaction,
                        interaction,
                        msg,
                        reaction.user.id,
                        0,
                        reaction.user.username
                      );
                    }
                  } else if (reaction.customId === "iTwo") {
                    if (
                      reaction.user.id !== this.currentPlayer &&
                      (reaction.user.id === this.p1ID ||
                        reaction.user.id === this.p2ID)
                    ) {
                      await reaction.reply({
                        content:
                          "You have the chance to use your items once it is your turn! ((´д｀))",
                        ephemeral: true,
                      });
                    } else if (
                      reaction.user.id !== this.p1ID &&
                      reaction.user.id !== this.p2ID
                    ) {
                      await reaction.reply({
                        content:
                          "It seems you are not part of this game. You can't use these items! ((´д｀))",
                        ephemeral: true,
                      });
                    } else {
                      //USE SECOND ITEM
                      this.useItem(
                        reaction,
                        interaction,
                        msg,
                        reaction.user.id,
                        1,
                        reaction.user.username
                      );
                    }
                  }
                });
              })
              .catch(async (e) => {
                console.log("RANDOM DISCORD API ERROR (NON FATAL)" + e);
                await interaction.editReply(
                  "Kumo couldn't start the duel this time. Please try again."
                );
                return;
              });
            //Change to 20000, due to extra information being shown on the screen.
          }, 20000)
        );
        //Change to 4000
      }, 4000)
    );
  }
}

module.exports = { KumoDuel };
