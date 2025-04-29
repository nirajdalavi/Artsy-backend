

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); 

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImageUrl: { type: String }, 
  favorites: [
    {
      artistId: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); 

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    const hash = crypto.createHash('md5').update(this.email.trim().toLowerCase()).digest('hex');
    this.profileImageUrl = `https://www.gravatar.com/avatar/${hash}?d=identicon`;

    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;