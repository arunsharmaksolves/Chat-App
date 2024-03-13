const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const User = require("../model/User.js");
const jwt = require("jsonwebtoken");
const crypto = require('crypto')

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

exports.signup = async (req, res) => {
  const { email,password } = req.body;
  console.log(req.body)
  // Check we have an email
  if (!email) {
    return res.status(422).json({ message: "Missing email." });
  }
  try {
    // Check if the email is in use
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "Email is already in use.",
      });
    }
    console.log("hello")
    // Step 1 - Create and save the user
    const user = await new User({
      _id: new mongoose.Types.ObjectId(),
      email: email,
      password:password
    }).save();

    console.log(user)

    // Step 2 - Generate a verification token with the user's ID
    const verificationToken = user.generateVerificationToken();

    // Step 3 - Email the user a unique verification link
    const url = `http://localhost:3000/api/verify/${verificationToken}`;
    transporter.sendMail(
      {
        from: "priyanshu.yadav@ksolves.com",
        to: email,
        subject: "Verify Account",
        html: `Click <a href = '${url}'>here</a> to confirm your email.`,
      },
      (err, res) => {
        if (err) {
          console.log(err);
        } else {
          console.log("msg sent");
        }
      }
    );
    return res.status(201).json({
      message: `Sent a verification email to ${email}`,
    });
  } catch (err) {
    console.log(err)
    return res.status(500).json(err);
  }
};

exports.login = async (req, res) => {
  const { email } = req.body;
  // Check we have an email
  if (!email) {
    return res.status(422).json({
      message: "Missing email.",
    });
  }
  try {
    // Step 1 - Verify a user with the email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User does not exists",
      });
    }
    // Step 2 - Ensure the account has been verified
    if (!user.verified) {
      return res.status(403).json({
        message: "Verify your Account.",
      });
    }
    const verificationToken = jwt.sign(
      { ID: user._id },
      process.env.USER_VERIFICATION_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    return res.status(200).json({
      message: "User logged in",
      verificationToken,
    });
  } catch (err) {
    return res.status(500).json(err);
  }
};

exports.verify = async (req, res) => {
  const { token } = req.params;
  // Check we have an id
  if (!token) {
    return res.status(422).json({
      message: "Missing Token",
    });
  }
  // Step 1 -  Verify the token from the URL
  let payload = null;
  try {
    payload = jwt.verify(token, process.env.USER_VERIFICATION_TOKEN_SECRET);
    // console.log(payload)
  } catch (err) {
    console.log("hello");
    return res.status(500).json(err);
  }
  try {
    // Step 2 - Find user with matching ID
    const user = await User.findOne({ _id: payload.ID });
    if (!user) {
      return res.status(404).json({
        message: "User does not exists",
      });
    }
    if (user.verified) {
      return res.status(200).json({
        message: "Account Already Varified",
      });
    }
    // Step 3 - Update user verification status to true
    user.verified = true;
    await user.save();
    return res.status(200).json({
      message: "Account Verified",
    });
  } catch (err) {
    return res.status(500).json(err);
  }
};

exports.forgotPassword = async (req, res) => {
  // find the user, if present in the database
  const user = await User.findOne({ 
    email: req.body.email });

  if (!user) {
    return res.status(400).send("There is no user with that email");
  }
//   console.log("hello" + user);

  // Generate the reset token
  const resetToken = user.createPasswordResetToken();
  await user.save();
//   console.log(user);
  const resetUrl = `http://localhost:3000/api/reset-password/${resetToken}`;

  try {
    const message = `Forgot your password? Submit this link: ${resetUrl}.\n If you did not request this, please ignore this email and your password will remain unchanged.`;

    transporter.sendMail(
      {
        from: "priyanshu.yadav@ksolves.com",
        to: req.body.email,
        subject: "Verify Account",
        text: message,
      },
      (err, res) => {
        if (err) {
          console.log(err);
        } else {
          console.log("msg sent");
        }
      }
    );

    res.status(200).json({
      status: "success",
      message: "messsage sent to mail",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    console.log("error");
    res.send(error);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    // Finds user based on the token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // console.log("hello"+user)

    if (!user) {
      return res.status(400).send("Token is invalid or has expired");
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    // console.log(user)
    res.status(200).json({
      status: "success",
    });
  } catch (error) {
    console.log(error)
    res.send(error);
  }
};
