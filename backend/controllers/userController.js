
    const jwt = require('jsonwebtoken')
    const bcrypt = require('bcryptjs')
    const asyncHandler = require('express-async-handler')
    const User = require('../models/userModel')

//@desc    Register new user
//@route   POST /api/users
//@access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please add all required fields");
  }

  // Check if user exists
  const userExist = await User.findOne({ email });
  if (userExist) {
    res.status(400);
    throw new Error("User already exists");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user (role defaults to schema default if not provided)
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "staff", // fallback to "staff" if no role provided
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

 //@desc    Authenticate a user
//@route   POST /api/users/login
//@access  Public
const loginUser = asyncHandler(async (req, res) => {    
  const { email, password } = req.body;

  // Check user email
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role, // ✅ include role
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid credentials");
  }
});


//@desc    Get user data
//@route   GET /api/users/me
//@access  Private
const getMe = asyncHandler(async (req, res) => {
  // Assuming `req.user` is set in authMiddleware from token
  res.status(200).json(req.user)
});


// @desc    Get all users
// @route   GET /api/users
// @access  Private (admin only, for example)
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password') // exclude password
  res.status(200).json(users)
})


    //Generate JWT
const generateToken = (id) =>{
    return jwt.sign({id}, process.env.JWT_SECRET, {
         expiresIn:'30d',
    }
        
    )
}

    module.exports = {
        registerUser,
        loginUser,
        getMe,
        getUsers
    }