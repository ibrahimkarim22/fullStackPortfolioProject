const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
    accessKey: {
        type: String,
        required: true,
        unique: true
    },
    groupName: {
        type: String,
    },
    memebers: [String]
}, {
    timestamps: true
})

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;