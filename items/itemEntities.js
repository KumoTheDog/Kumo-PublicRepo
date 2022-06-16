const { Apple } = require("./apple");
const { Broom } = require("./broom");
const { Jam } = require("./jam");
const { Laptop } = require("./laptop");
const { Wallet } = require("./wallet");
const { Cloak } = require("./cloak");

//All items specific to the game itself can be found here. Can be added to if more items are thought of.
const appleRed = new Apple(
  "Red Apple",
  "A shiny red apple!",
  "Increase your HP by a flat amount of `60`. Upon use, you consume the apple but are too lethargic to move, hereby passing the turn to your opponent."
);
const brownBroom = new Broom(
  "Brown Broom",
  "A dusty brown broom. Looks like its been taken out of a janitor closet...",
  "Increases your attack power by `30%` **for that turn**. Upon use, you attack the opponent with your broom, passing over the turn. Keep in mind that you can miss, despite using the broom."
);
const blackcurrantJam = new Jam(
  "Blackcurrant Jam",
  "A sample of blackcurrant jam - has colours so rich you could stare at it all day.",
  "Increases your HP by a variable amount - between `10%` and `60%`. Upon use, the jam is ate, you admire its deliciousness and the turn is passed over to the opponent."
);
const hackerLaptop = new Laptop(
  "Hacker's Laptop",
  "A 30 year old laptop found on top of a bin. You can't identify the distro it uses.",
  "Risky but rewarding - When used, your turn ends **but** you have a `5%` chance to **end the duel completely** by hacking your opponent."
);
const loadedWallet = new Wallet(
  "Coin-Filled Wallet",
  "A smooth leather wallet which seems to only be filled with pennies?",
  "Look inside the wallet and count the amount of coins you have inside. Upon use, you attack the opponent - they get hit for your **base damage** **plus** `1` damage for each coin in your wallet. You can still miss your attack though..."
);
const shadowCloak = new Cloak(
  "Shadow Cloak",
  "A rich, dark hued cloak. So disguised that you have to squint to see!",
  "Makes it difficult for the opponent to hit you on their next turn. Upon use, you shall attack as normal **then** put on the cloak. Valid for `1` turn. However, if you miss your initial attack, you DO still end up wearing your cloak - your evasiveness will still be increased by `70%`**"
);

var gameItemList = [
  brownBroom,
  blackcurrantJam,
  appleRed,
  hackerLaptop,
  loadedWallet,
  shadowCloak,
];

function fetchGameItems() {
  return gameItemList;
}

module.exports = { fetchGameItems };
