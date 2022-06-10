const { Item } = require("./item");

//Increase HP between 40% and 100%
class Jam extends Item {
  constructor(name, description, perk) {
    super(name, description, perk);
  }

  useItem() {
    return "jam";
  }
}

module.exports = { Jam };
