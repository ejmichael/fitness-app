import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Camera, Image as ImageIcon, Trash2, Loader2, Utensils } from 'lucide-react';
import '../styles/Meals.css';

const Meals = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('today');
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualMeal, setManualMeal] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMeals();
  }, [view]);

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/meals?range=${view}`);
      setMeals(res.data.meals || []);
    } catch (err) {
      setError('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return setError('Please upload an image file');
    }

    try {
      setAnalyzing(true);
      setError('');
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/meals/analyze-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMeals([res.data, ...meals]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteMeal = async (id) => {
    if (!window.confirm('Delete this meal?')) return;
    try {
      await api.delete(`/meals/${id}`);
      setMeals(meals.filter((m) => m._id !== id));
    } catch (err) {
      setError('Failed to delete meal');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualMeal.name || !manualMeal.calories) {
      setError('Please provide at least a name and calorie count.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/meals', {
        ...manualMeal,
        calories: Number(manualMeal.calories),
        protein: Number(manualMeal.protein) || 0,
        carbs: Number(manualMeal.carbs) || 0,
        fat: Number(manualMeal.fat) || 0
      });
      setMeals([res.data, ...meals]);
      setShowManualForm(false);
      setManualMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    } catch (err) {
      setError('Failed to add meal manually');
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = (capture = false) => {
    if (fileInputRef.current) {
      if (capture) {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <header className="page-header-row">
        <div>
          <h1 className="page-title">Meal Tracker</h1>
          <p className="page-subtitle">Log your meals easily via image recognition.</p>
        </div>

        <div className="view-toggle">
          <button
            onClick={() => setView('today')}
            className={`toggle-btn ${view === 'today' ? 'active' : ''}`}
          >
            Today
          </button>
          <button
            onClick={() => setView('week')}
            className={`toggle-btn ${view === 'week' ? 'active' : ''}`}
          >
            Past Week
          </button>
        </div>
      </header>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {/* Action Area */}
      <div className="card upload-card">
        {analyzing && (
          <div className="analyzing-overlay">
            <Loader2 className="spin-icon" size={32} />
            <p style={{ color: 'white', fontWeight: 500 }}>Analyzing food with AI...</p>
          </div>
        )}

        <div className="upload-content">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white', margin: '0 0 0.25rem 0' }}>Add a Meal</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Snap a photo or log macros manually.</p>
          </div>
          
          <div className="btn-group">
            <input
              type="file"
              accept="image/jpeg, image/png, image/webp"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            
            <button onClick={() => triggerFileInput(true)} className="btn-primary" disabled={analyzing}>
              <Camera size={20} />
              <span>Camera</span>
            </button>
            
            <button onClick={() => triggerFileInput(false)} className="btn-secondary" disabled={analyzing}>
              <ImageIcon size={20} />
              <span>Gallery</span>
            </button>

            <button onClick={() => setShowManualForm(!showManualForm)} className="btn-secondary" disabled={analyzing}>
              <Utensils size={20} />
              <span>{showManualForm ? 'Cancel' : 'Manual'}</span>
            </button>
          </div>
        </div>

        {showManualForm && (
          <form className="manual-meal-form" onSubmit={handleManualSubmit}>
            <div className="form-grid">
              <div className="form-group wide">
                <label>Meal Name</label>
                <input 
                  type="text" 
                  value={manualMeal.name}
                  onChange={(e) => setManualMeal({...manualMeal, name: e.target.value})}
                  placeholder="e.g. Grilled Chicken Salad"
                  required
                />
              </div>
              <div className="form-group">
                <label>Calories</label>
                <input 
                  type="number" 
                  value={manualMeal.calories}
                  onChange={(e) => setManualMeal({...manualMeal, calories: e.target.value})}
                  placeholder="kcal"
                  required
                />
              </div>
              <div className="form-group">
                <label>Protein (g)</label>
                <input 
                  type="number" 
                  value={manualMeal.protein}
                  onChange={(e) => setManualMeal({...manualMeal, protein: e.target.value})}
                  placeholder="g"
                />
              </div>
              <div className="form-group">
                <label>Carbs (g)</label>
                <input 
                  type="number" 
                  value={manualMeal.carbs}
                  onChange={(e) => setManualMeal({...manualMeal, carbs: e.target.value})}
                  placeholder="g"
                />
              </div>
              <div className="form-group">
                <label>Fat (g)</label>
                <input 
                  type="number" 
                  value={manualMeal.fat}
                  onChange={(e) => setManualMeal({...manualMeal, fat: e.target.value})}
                  placeholder="g"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary log-btn">Log Meal</button>
          </form>
        )}
      </div>

      {/* Meals List */}
      <div>
        <h3 className="section-header">Your Meals</h3>
        
        {loading ? (
          <div>Loading...</div>
        ) : meals.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', background: 'transparent', border: '2px dashed rgba(255, 255, 255, 0.1)' }}>
            <Utensils style={{ margin: '0 auto 1rem auto', color: '#4b5563' }} size={48} />
            <p style={{ color: 'var(--text-muted)' }}>No meals logged for this period.</p>
          </div>
        ) : (
          <div className="meals-grid">
            {meals.map((meal) => (
              <div key={meal._id} className="card meal-card">
                {meal.imageUrl ? (
                  <div className="meal-img-container">
                    <img 
                      src={meal.imageUrl.startsWith('http') ? meal.imageUrl : `${(import.meta.env.VITE_API_URL || '').replace('/api', '')}${meal.imageUrl}`}
                      alt={meal.name}
                      className="meal-img"
                    />
                  </div>
                ) : (
                  <div className="meal-placeholder">
                    <Utensils size={48} />
                  </div>
                )}
                
                <div className="meal-info">
                  <div className="meal-title-row">
                    <h4 className="meal-name" title={meal.name}>{meal.name}</h4>
                    <span className="meal-cals">{meal.calories} kcal</span>
                  </div>
                  
                  <p className="meal-date">
                    {new Date(meal.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  
                  <div className="meal-macros">
                    <div>
                      <p className="macro-header">Protein</p>
                      <p className="macro-amt">{meal.protein}g</p>
                    </div>
                    <div>
                      <p className="macro-header">Carbs</p>
                      <p className="macro-amt">{meal.carbs}g</p>
                    </div>
                    <div>
                      <p className="macro-header">Fat</p>
                      <p className="macro-amt">{meal.fat}g</p>
                    </div>
                  </div>
                </div>

                <button onClick={() => deleteMeal(meal._id)} className="delete-btn" title="Delete meal">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Meals;
