const Messages = require("../models/benSchema2");
const mongoose = require("mongoose");

async function addPointsToUser(
  userID,
  messagePointsAdd,
  voicePointsAdd,
  currentDate
) {
  if (process.env.DBTOKEN && process.env.ASTRING && process.env.BSTRING) {
    let messageUser = await Messages.findOne({
      Partial: userID.slice(0, 8),
    })
      .clone()
      .catch(function (err) {
        console.log(err);
      });

    //If no user matching the criteria is found, a new entry is made for the user.
    if (!messageUser) {
      console.log("New DB user has been created.");
      messageUser = new Messages({
        Partial: userID.slice(0, 8),
        UserID: userID,
        messages: 0,
        voiceMessages: 0,
        made_at: currentDate, //Normally Date.now
      });
      await messageUser.save().catch((e) => console.log(e));
    }

    //After the entry is created OR found it can be incremented.
    await Messages.findOne(
      {
        Partial: userID.slice(0, 8),
      },
      async (err, dUser) => {
        dUser.messages += messagePointsAdd;
        dUser.voiceMessages += voicePointsAdd;
        await dUser.save().catch((e) => console.log(e));
      }
    )
      .clone()
      .catch(function (err) {
        console.log(err);
      });

    console.log(
      "📗: The encrypted entry beginning with key " +
        userID.slice(0, 8) +
        " has been increased!"
    );
  } else {
    console.warn(
      "📙: As no database has been supplied, or missing encryption/signing key, scores have not been increased."
    );
  }
}

module.exports = { incrementDB: addPointsToUser };
