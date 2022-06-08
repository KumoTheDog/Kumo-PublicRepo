# kumo-PublicRepo

![alt text](https://github.com/JSusak/kumo-PublicRepo/blob/main/resources/main_logo.png)

**Public repository for the latest version of 'Kumo The Dog' verified Discord bot!** ૮ ˶´ ᵕˋ ˶ა A simple chatbot made for fun which somehow grew big enough to get a tick. Kumo features:

- The ability to talk in **VOICE** or **TEXT CHANNELS**.
- Slash commands, message content is not stored to respect user privacy :)
- Real-Time responsiveness, minimal latency
- Global Leaderboards
- Games!

## Requirements for creating a local instance

- An up-to-date version of [**Discord.js**](https://discord.js.org/#/) `v13.6.0` UPDATE: Any further versions of the bot require the use of a version >= `v13.7.0` due to the introduction of [Modals](https://discordjs.guide/interactions/modals.html#building-and-responding-with-modals) since May 2022.
- An up-to-date version of [**Node.js**](https://nodejs.org/en/) >= `v16.14.2`
- Basic knowledge of [**JavaScript**](https://www.javascript.com/)
- A Discord server to test your instance on.
- _OPTIONAL_: A [MongoDB](https://www.mongodb.com/) account, _32 byte encryption key_ and _64 byte signing key_.

## Setting up the project

The bot was made in _Visual Studio Code_ so any instructions discussed from here are under the assumption you are using this IDE too!

- [**Fork the repository.**](https://github.com/JSusak/Kumo-PublicRepo/fork)
- Alternatively, you can clone the repository by running `git clone https://github.com/JSusak/kumo-the-dog-Public.git` but no changes will be made due to the lack of write access.
- Once the code appears in your IDE, run `npm i` or `npm install` in order to install all packages required for the bot to work.
- At this point, the bot should be able to load up by typing `node index.js` but will ultimately cease to work because no .env file has been defined. Instruction for this are found below.

## Creating your .env file

Once the code is all set up, you should then put in your own .env file to define your own environment variables. It is assumed that your own Discord application in the developer portal has already been initialised:

BOTTOKEN=`Secret Token here` \
CLIENTID=`Client ID here`\
TEST_GUILD_ID=`ID of test server here, OPTIONAL`\
DBTOKEN=`Link to access MongoDB cluster here, OPTIONAL`\
ASTRING=`32 byte, base64 string here, REQUIRED IF DBTOKEN IS USED`\
BSTRING=`64 byte, base64 string here, REQUIRED IF DBTOKEN IS USED`
FEEDBACKCHANNEL=`ID of the text channel that you would like feedback to be sent to, OPTIONAL`\

If you want to be completely sure that this file won't get tracked upon further changes you can perform the following:

- Add .env to a .gitignore file.
- Remove the .env file from the git cache by running `git rm --cached .env` in the terminal.
- When you run `git add filename` you should get a warning telling you that .env has been added to .gitignore, terminating the operation.
- Type `git commit -m "comment here"` to save your changes!

There are two ways I have found to generate the ASTRING and BSTRING, corresponding to a 32 byte encryption key and 64 byte signing key respectively:

1. Using the standard JavaScript 'Crypto' module.

```
node -e "require('crypto').randomBytes(32/64, function(ex, enc) {
     console.log(enc.toString('base64'))
     });"
```

Changing the number in the first line between 32/64 produces a 32 byte/64 byte string. Then just paste it into ASTRING and BSTRING.

2. Downloading OpenSSL (Windows Machines only).

- Go to [this site](https://slproweb.com/products/Win32OpenSSL.html) and choose the download for your machine. This is a useful installer which provides installation of openSSL in a timely fashion. Follow the instructions on the executable. Once it is done you should be able to type `openssl rand -base64 32;` and `openssl rand -base64 64;` for the corresponding encryption and signing key.

Personally, I would not bother with supplying these values and the database for a local instance of the bot, but it is here if you want to try. If you don't want that specific variable in the .env file just delete the line.

## Connecting to MongoDB

```diff
+ If you have not supplied a DB token feel free to disregard this section.
```

As further outlined in the privacy policy of the bot, data stored for longer than runtime is handled in a way that is respectful and secure - Data is used for the prime purpose of updating the leaderboard positions and is NOT used in any way other than to facilitate the implementation of the leaderboard command. By using the bot you have opted into the collection of this data - if you do not agree with anything outlined in the Terms of Services or Privacy Policy, please discontinue the use of this bot.

In order to comply with the Discord developer policy, all sensitive data is encrypted at rest and is automatically deleted from the database **30** days after first use of the bot - After the 30 days, your leaderboard scores get reset. Sensitive data is encrypted with `AEC-256-CBC` and authentication with `HMAC-SHA-512`. Some fields are stored in plain text but are incomprehensible to an outside user - there is no way to identify a user based on the information found in the database alone.

With that out of the way, lets actually talk about how to put the database into your own .env file :)

1. Go to [MongoDB](https://www.mongodb.com/) and create an account! For more security, I would recommend adding a form of MFA to your as in the case of my own DB.
2. Build a database. A 'shared' option is more than enough for the purposes of this bot. If you have to select any options, the default ones should be fine!
3. Wait for it to build and go to Database Access on the right side of the screen. There, a green button should be present to 'Add new Database User'.
4. Create a user to access your database. An easy option would be 'Password' authentication. Choose a username and make a password (autogenerate if you want :)) and allow this user to 'read and write to any database'. You can make any other changes but they are not required.
5. Go back to the database you just created and click 'connect' > 'Connect your application'
6. There should be a link for you to copy and paste. Further instructions are provided on the MongoDB page.
7. You should now have a completed link, ready to paste in the .env file!
8. Generate your encryption and signing key as outlined in the prior section if you haven't already.

Congratulations! After putting all the variables into the .env file your very own database should be set up! ヽ(⌐■_■)ノ ♪♬
Keep it open to see the database in action!

Do keep in mind that connecting to MongoDB is **NOT NEEDED** and the core, intended functionality of the bot **WILL** work. The only thing that will stop working is the leaderboard function. You aren't missing anything if you decide not to make a database :)

## Brief Command Explanations

- **/askkumo** `questions`: Talk to Kumo within a text channel.

  A question must be inputted by the user to which Kumo replies in the current text channel.

  A cooldown of 10 seconds has been applied to all users to reduce spam, allowing Kumo to think more about your questions! Upon answering, your leaderboard score is increased.

- **/callkumo**: While in a voice channel, call Kumo into the VC to talk to him directly.

  Operates on speaker updates - The bot listens while a user is talking, providing an appropriate response into the voice channel once finished.
  Base voicelines have been added but I plan to introduce some funnier ones down the line.

  Upon initial call, Kumo responds to the user who activates the command.

  To reduce spamming and the chance for users to get easy points, there is a cooldown of 8 seconds in every voice channel. When a question is asked, the user who asked it gets leaderboard points - the rest must wait for the next chance!

- **/kickkumo**: Simply kick Kumo from the VC - plays a hanging up sound and leaves immediately after. Be sure to kick Kumo, otherwise the bot may stay around in your server all day!

- **/kumopoll `question` `response1` `response2` `total_responses`**: Create a simple two way poll, comprising of a custom question, your two responses and the threshold for which the poll closes as users answer.

- **/leaderboard**: Create a global leaderboard containing the current standings of who has used Kumo the most! Currently shows the top 5 text and voice users in separate leaderboards, as well as your current position if you are not in the top 5. Fight with others to prove who has the strongest bond with Kumo!

- **/kumoinfo**: Find out some miscellaneous statistics about Kumo! Tells you the versions of the core packages used, runtime since last restart alongside the total number of guilds + users in all these guilds.

- **/kumomatch `opponent` `playercolour` `opponentcolour`**: Start a game of Kumo Match! You have the option to play by yourself but I obviously recommend playing with 2 people. The game works by matching the chips corresponding to your colour. You must match **5** of these chips in a row, either horizontally, vertically or diagonally. I MAY add the ability to give extra leaderboard points to the winner but I'm not sure now.

- **/kumoline `opponent` `playercolour` `opponentcolour`**: Start a game of Kumo Line! Quite similar to Match but instead of 5 chips you must match 3 hearts in any direction BUT you can place these hearts in any position in the grid.

- **/kumoduel `opponent` `basehp`**: Challenge a user to Kumo Duel! Work in progress, intended to be a turn based fighting game, with player inventories and log files...Next command, I aim to finish it very soon. 07/06/22: Finished confirmation menu, battle logic, fleeing logic, item menu and history file. Still have to work on applying perks to the duel whenever an item is used. Should be done by the end of this week! Added one working item, hacker's laptop, so far.

- **/kumoratio `user`**: Begin a ratio, either directed at a specific user, yourself, the bot or indirectly within a text channel. The ratio begins with a 30 second timer and stops recording contributors after this timer runs out. BUT, every new contributor extends the timer by another 30 seconds! Different responses depending on the success rate of the overall ratio.

- **/feedback**: Provide some helpful feedback to me! Opens a modal in which you must answer what you have enjoyed upon using the bot, any future implementation you would like to see as well as any bugs you have found during runtime. There must be some response, even putting 'none' would suffice!

This part will get updated as new commands roll out. I am happy to explain any commands in a further level of detail if you join my support server down below ;)

## Plans

When I have time I plan to:

- Create a basic website for Kumo displaying the commands in action alongside displaying miscellaneous links to invite Kumo to your server and its stats.
- More accurate voice recognition - perhaps Kumo can respond to specific questions beginning with a certain command word, like its name?
- Work on creating a more elegant design for Kumo overall, by improving the quality of the pictures!
- Add some new commands, like Kumo's activities( /(total users/servers, runtime stats)...) and interactive games made using Discord JS. WORK IN PROGRESS: I am coming up with game ideas right now!

## Contributing

Any contributions to improving the quality of this project would be extremely helpful - I don't always have the time to be maintaining Kumo. For any assistance regarding contributions feel free to join the [Support Server](https://discord.gg/vKPnktZan9).

## Further Links

If you want to discuss anything ranging from the implementation of the bot, deletion of stored data before the 30 day limit or just want to talk, my [Support Server](https://discord.gg/vKPnktZan9) is here and you are more than welcome to open a ticket. I am still working on making the server better.

My [Terms of Service](https://github.com/JSusak/kumo-the-dog-documentation/blob/main/TermsOfServices.md) and [Privacy Policy](https://github.com/JSusak/kumo-the-dog-documentation/blob/main/PrivacyPolicy.md) are here.

Kumo has been verified on [top.gg!](https://top.gg/bot/960100480225267733) In the future, I may plan to integrate webhooks to give some small voting rewards.

The bot is live on [discordbotlist.com](https://discordbotlist.com/bots/kumo-the-dog).

I would be extremely grateful for any upvotes :))))

Thanks for using Kumo and checking out my repo. I hope you enjoy playing around with the bot :)  
~ Saracen (Josh)
