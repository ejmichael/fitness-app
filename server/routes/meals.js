const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');
const Meal = require('../models/Meal');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files (jpg, png, webp) are allowed'));
  },
});

// Get meals (supports ?date=YYYY-MM-DD and ?range=week)
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
      // Default: today
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    const meals = await Meal.find({
      userId: req.user._id,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: -1 });

    // Calculate totals
    const totals = meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    res.json({ meals, totals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a meal manually
router.post('/', auth, async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, date } = req.body;
    const meal = new Meal({
      userId: req.user._id,
      name,
      calories,
      protein: protein || 0,
      carbs: carbs || 0,
      fat: fat || 0,
      date: date || new Date(),
    });
    await meal.save();
    res.status(201).json(meal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze food image with Gemini
router.post('/analyze-image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Read the uploaded image
    const imagePath = req.file.path;
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const prompt = `Analyze this food image and estimate the nutritional content. 
    Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
    {
      "name": "name of the food/meal",
      "calories": estimated_calories_number,
      "protein": estimated_protein_grams_number,
      "carbs": estimated_carbs_grams_number,
      "fat": estimated_fat_grams_number
    }
    Be as accurate as possible with your estimates. If you see multiple food items, combine them into one total.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: base64Image,
        },
      },
    ]);

    const responseText = result.response.text().trim();
    
    // Parse the JSON response (handle potential markdown code blocks)
    let nutritionData;
    try {
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      nutritionData = JSON.parse(jsonStr);
    } catch (parseError) {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: responseText });
    }

    // Save as a meal
    const meal = new Meal({
      userId: req.user._id,
      name: nutritionData.name || 'Analyzed Meal',
      calories: Math.round(nutritionData.calories) || 0,
      protein: Math.round(nutritionData.protein) || 0,
      carbs: Math.round(nutritionData.carbs) || 0,
      fat: Math.round(nutritionData.fat) || 0,
      imageUrl: `/uploads/${req.file.filename}`,
      date: new Date(),
    });
    await meal.save();

    res.status(201).json(meal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a meal
router.delete('/:id', auth, async (req, res) => {
  try {
    const meal = await Meal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Delete associated image if exists
    if (meal.imageUrl) {
      const imagePath = path.join(__dirname, '..', meal.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: 'Meal deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
