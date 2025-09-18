// controllers/unsignedController.js
const UnsignedVC = require('../models/unsignedVc');
const asyncHandler = require('express-async-handler');

const createUnsignedVC = asyncHandler(async (req, res) => {
  const { studentId, type, purpose, expiration } = req.body;

  if (!studentId || !type || !purpose || !expiration) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  const expirationDate = new Date(expiration);
  if (isNaN(expirationDate)) {
    res.status(400);
    throw new Error("Invalid expiration format");
  }

  const draft = await UnsignedVC.create({
    student: studentId,
    type,
    purpose,
    expiration: expirationDate,
  });

  res.status(201).json(draft);
});


const getUnsignedVCs = asyncHandler(async (req, res) => {
  const drafts = await UnsignedVC.find().populate('student');
  res.json(drafts);
});

module.exports = { createUnsignedVC, getUnsignedVCs };
