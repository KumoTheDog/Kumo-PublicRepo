const { Item } = require("./item");

//Increase HP by a flat amount of 60.
class Apple extends Item {
  constructor(name, description, perk) {
    super(name, description, perk);
  }

  useItem() {
    return "apple";
  }
}

module.exports = { Apple };
