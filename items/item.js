class Item {
  constructor(name, description, perk) {
    this.nm = name;
    this.desc = description;
    this.buff = perk;
  }

  getName() {
    return this.nm;
  }
  getDescription() {
    return this.desc;
  }
  getBuff() {
    return this.buff;
  }
}

module.exports = { Item };
