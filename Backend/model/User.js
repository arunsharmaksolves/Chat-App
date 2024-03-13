const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt')

const jwt = require('jsonwebtoken');
const UserSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    email: String,
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
      },
      passwordChangedAt: Date,
      passwordResetToken: String,
      passwordResetExpires: Date,
});
UserSchema.pre('save', async function (next) {
    // Hash the user password
    this.password = await bcrypt.hash(this.password, 12);
    next();
  });

UserSchema.methods.generateVerificationToken = function () {
    const user = this;
    const verificationToken = jwt.sign(
        { ID: user._id },
        process.env.USER_VERIFICATION_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
    return verificationToken;
};

UserSchema.methods.createPasswordResetToken = function () {
    // generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // encrypt the token
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // sets the time the reset password token expire (10 mins)
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
  };
module.exports = mongoose.model("User", UserSchema);