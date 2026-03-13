const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Meal name is required'],
    trim: true,
  },
  calories: {
    type: Number,
    required: [true, 'Calories are required'],
    min: 0,
  },
  protein: {
    type: Number,
    default: 0,
    min: 0,
  },
  carbs: {
    type: Number,
    default: 0,
    min: 0,
  },
  fat: {
    type: Number,
    default: 0,
    min: 0,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for user + date queries
mealSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Meal', mealSchema);
