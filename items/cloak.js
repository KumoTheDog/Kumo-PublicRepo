//Cloack - Makes it harder for the opponent to hit you on the next turn. Skips your turn.

const { Item } = require("./item");
class Cloak extends Item {
  constructor(name, description, perk) {
    super(name, description, perk);
  }

  useItem() {
    return "cloak";
  }
}

module.exports = { Cloak };
