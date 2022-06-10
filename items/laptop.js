const { MessageEmbed } = require("discord.js");
const { Item } = require("./item");

//Has a 5% chance to hack the other player, automatically giving a win.
class Laptop extends Item {
  constructor(name, description, perk) {
    super(name, description, perk);
  }

  useItem() {
    return "laptop";
  }
}

module.exports = { Laptop };
