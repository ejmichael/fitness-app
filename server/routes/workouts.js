const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');
const Workout = require('../models/Workout');

const router = express.Router();

// Get workouts (supports ?date=YYYY-MM-DD and ?range=week)
router.get('/', auth, async (req, res) => {
  try {
    const { date, range } = req.query;
    let startDate, endDate;

    if (date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      if (range === 'week') {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      }
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    const workouts = await Workout.find({
      userId: req.user._id,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: -1 });

    // Get all workouts for streak/activity calculation (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentWorkouts = await Workout.find({
      userId: req.user._id,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 });

    // Calculate Streak
    let streak = 0;
    const workoutDates = [...new Set(recentWorkouts.map(w => new Date(w.date).toDateString()))];
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (workoutDates.includes(today) || workoutDates.includes(yesterdayStr)) {
      let current = workoutDates.includes(today) ? new Date() : yesterday;
      while (workoutDates.includes(current.toDateString())) {
        streak++;
        current.setDate(current.getDate() - 1);
      }
    }

    res.json({
      workouts,
      stats: {
        streak,
        totalRecent: recentWorkouts.length,
        activity: workoutDates // List of dates worked out
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a workout
router.post('/', auth, async (req, res) => {
  try {
    const { name, exercises, date } = req.body;
    const workout = new Workout({
      userId: req.user._id,
      name,
      exercises: exercises || [],
      date: date || new Date(),
    });
    await workout.save();
    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a workout (add exercises, sets, etc.)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, exercises } = req.body;
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, exercises },
      { new: true, runValidators: true }
    );

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json(workout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a workout
router.delete('/:id', auth, async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json({ message: 'Workout deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parse voice transcription into workout structure
router.post('/parse-voice', auth, async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Parse this workout transcript into a structured JSON object. 
    Transcript: "${transcript}"
    
    Return ONLY a valid JSON object with this exact structure:
    {
      "name": "A descriptive name for the workout (e.g., 'Upper Body Strength')",
      "exercises": [
        {
          "name": "Name of the exercise",
          "sets": [
            { "reps": number, "weight": number }
          ]
        }
      ]
    }
    
    Rules:
    1. Assume ALL weights are in KILOGRAMS (kg). Just return the number.
    2. Be smart about recognizing multiple exercises and multiple sets. 
    3. If the transcript says "3 sets of 10", create 3 identical set objects in the "sets" array.
    4. If a weight is mentioned (e.g. "at 60", "with 60 kg", "60 kilograms"), capture it as the "weight".
    5. Examples:
       - "Bench press 3 sets of 10 at 60kg" -> { "name": "Bench Press", "exercises": [{ "name": "Bench Press", "sets": [{ "reps": 10, "weight": 60 }, { "reps": 10, "weight": 60 }, { "reps": 10, "weight": 60 }] }] }
       - "Squats 4 by 8 with 100" -> { "name": "Squat Workout", "exercises": [{ "name": "Squats", "sets": [{ "reps": 8, "weight": 100 }, { "reps": 8, "weight": 100 }, { "reps": 8, "weight": 100 }, { "reps": 8, "weight": 100 }] }] }
    6. Return ONLY the JSON. No markdown, no triple backticks.`;

    console.log('🎙️ Incoming Transcript:', transcript);
    let parsedData;
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      console.log('🤖 Raw AI Response:', responseText);
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(jsonStr);
      console.log('✅ Parsed Data:', JSON.stringify(parsedData, null, 2));
    } catch (aiError) {
      console.warn("❌ AI Parsing failed, using fallback:", aiError.message);
      // Fallback to basic parsing
      parsedData = fallbackParseWorkout(transcript);
      console.log('⚠️ Fallback Data:', JSON.stringify(parsedData, null, 2));
    }

    res.json(parsedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Basic regex fallback for workout parsing when AI is unavailable.
 */
function fallbackParseWorkout(transcript) {
  const text = transcript.toLowerCase().trim();
  const exercises = [];
  // Split by common delimiters
  const segments = text.split(/\s*(?:,\s*and\s+|,\s*then\s+|\.\s+|,\s+|\s+then\s+|\s+and\s+)/i);

  for (const segment of segments) {
    // Matches: "Exercise name 3 sets of 10 at 60", "Exercise 3 sets 10 reps @ 60kg", etc.
    // Group 1: Name, Group 2: Sets, Group 3: Reps, Group 4: Weight
    const pattern = /^(.+?)\s+(\d+)\s*sets?\s*(?:of\s*)?\s*(\d+)\s*(?:reps?)?\s*(?:(?:at|@|with)\s*)?(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilograms|lbs|pounds)?/i;
    const match = segment.trim().match(pattern);

    if (match) {
      const name = match[1].trim();
      const count = parseInt(match[2]);
      const reps = parseInt(match[3]);
      const weight = match[4] ? parseFloat(match[4]) : 0;
      const sets = Array.from({ length: count }, () => ({ reps, weight }));
      exercises.push({ name: name.charAt(0).toUpperCase() + name.slice(1), sets });
    } else {
      // Very basic fallback: name only
      const name = segment.trim();
      if (name.length > 2) {
        exercises.push({ name: name.charAt(0).toUpperCase() + name.slice(1), sets: [{ reps: 0, weight: 0 }] });
      }
    }
  }

  return {
    name: exercises.length > 0 ? exercises[0].name + (exercises.length > 1 ? '...' : '') : 'Workout Log',
    exercises
  };
}

module.exports = router;
