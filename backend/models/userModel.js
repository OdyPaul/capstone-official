const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
    },
    role: {
        type: String,
        enum: ['staff', 'admin', 'developer'], // allowed values
        default: 'staff' // default role
    },
    password: {
        type: String,
        required: [true, 'Please add a password']
    },
}, {
    timestamps: true,
})

module.exports = mongoose.model('User', userSchema)
