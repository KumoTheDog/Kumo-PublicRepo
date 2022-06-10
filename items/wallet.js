const { Item } = require("./item");

//Wallet - Generate a random amount of coins. Attack the user + add on the amount of coins in the wallet AKA if there were 40 coins, do attack + 40.
class Wallet extends Item {
  constructor(name, description, perk) {
    super(name, description, perk);
  }

  useItem() {
    return "wallet";
  }
}

module.exports = { Wallet };
