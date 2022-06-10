const { Item } = require("./item");

//Add an extra 30% attack power.
class Broom extends Item {
  constructor(name, description, perk) {
    super(name, description, perk);
  }

  useItem() {
    return "broom";
  }
}

module.exports = { Broom };
