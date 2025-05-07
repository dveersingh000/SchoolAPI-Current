const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pin: { type: String, match: /^\d{4}$/ },
  photo: { type: String },
  country: { type: String },
  proofOfResidence: { type: String },
  emailVerified: { type: Boolean, default: false },
  verificationCode: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
