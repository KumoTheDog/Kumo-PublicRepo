const mongoose = require('mongoose')
const encryption = require('mongoose-encryption')
require('dotenv').config();

const kumoSchema = new mongoose.Schema({
    Partial: String,
    UserID: String,
    messages: Number,
    voiceMessages: Number,
    made_at: Date,
})

var encKey = process.env.ASTRING;
var sigKey = process.env.BSTRING;

kumoSchema.index({"made_at": 1}, {expireAfterSeconds: 86400*30})

kumoSchema.plugin(encryption,{encryptionKey: encKey, signingKey: sigKey, excludeFromEncryption: ['Partial','messages','voiceMessages']})

module.exports = mongoose.model("benSchema2",kumoSchema)