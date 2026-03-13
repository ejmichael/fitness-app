const mongoose = require('mongoose');

const setSchema = new mongoose.Schema({
  reps: {
    type: Number,
    required: true,
    min: 0,
  },
  weight: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exercise name is required'],
    trim: true,
  },
  sets: [setSchema],
});

const workoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Workout name is required'],
    trim: true,
  },
  exercises: [exerciseSchema],
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

workoutSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Workout', workoutSchema);
