import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Calculator, Target, Save } from 'lucide-react';
import '../styles/Settings.css';

const Settings = () => {
  const { user, updateCalorieTarget } = useAuth();
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Manual target state
  const [manualTarget, setManualTarget] = useState(user?.calorieTarget || 2000);
  
  // Calculator state
  const [calcData, setCalcData] = useState({
    gender: 'male',
    age: 30,
    weight: 80, // kg
    height: 180, // cm
    activity: '1.2', // sedentary
    goal: 'maintain'
  });
  
  const [calculatedTDEE, setCalculatedTDEE] = useState(null);
  const [suggestedTarget, setSuggestedTarget] = useState(null);

  useEffect(() => {
    if (user) {
      setManualTarget(user.calorieTarget);
    }
  }, [user]);

  const handleCalcChange = (e) => {
    const { name, value } = e.target;
    setCalcData({ ...calcData, [name]: value });
  };

  const calculateTDEE = (e) => {
    e.preventDefault();
    
    // Using metric values directly
    const weightKg = parseFloat(calcData.weight);
    const heightCm = parseFloat(calcData.height);
    const age = parseInt(calcData.age);
    
    // Mifflin-St Jeor Equation
    let bmr;
    if (calcData.gender === 'male') {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    } else {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    }
    
    const tdee = bmr * parseFloat(calcData.activity);
    setCalculatedTDEE(Math.round(tdee));
    
    // Apply goal modifier
    let target = tdee;
    if (calcData.goal === 'lose') target -= 500;
    if (calcData.goal === 'gain') target += 500;
    
    setSuggestedTarget(Math.round(target));
  };

  const handleSaveTarget = async (target) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await updateCalorieTarget(target);
      setManualTarget(target);
      
      setSuccess('Calorie target updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update target');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <header className="page-header-row" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Settings & Goals</h1>
          <p className="page-subtitle">Configure your targets and app preferences.</p>
        </div>
      </header>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="auth-error">{error}</div>}

      <div className="settings-section">
        <h2 className="settings-title">
          <Target size={20} className="text-indigo-400" />
          Direct Calorie Target
        </h2>
        <p className="settings-subtitle">Manually set your daily calorie goal if you already know it.</p>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', maxWidth: '400px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Daily Calorie Target (kcal)</label>
            <input 
              type="number" 
              className="form-input" 
              value={manualTarget} 
              onChange={(e) => setManualTarget(e.target.value)}
            />
          </div>
          <button 
            className="btn-primary" 
            onClick={() => handleSaveTarget(manualTarget)}
            disabled={loading}
          >
            <Save size={18} style={{ marginRight: '0.5rem' }} /> Save
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">
          <Calculator size={20} className="text-emerald-400" />
          TDEE Calculator
        </h2>
        <p className="settings-subtitle">Calculate your Total Daily Energy Expenditure and get a target based on your goals.</p>
        
        <form onSubmit={calculateTDEE}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-select" value={calcData.gender} onChange={handleCalcChange}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Age (years)</label>
              <input type="number" name="age" className="form-input" value={calcData.age} onChange={handleCalcChange} required min="15" max="100" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input type="number" name="weight" className="form-input" value={calcData.weight} onChange={handleCalcChange} required min="30" max="250" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Height (cm)</label>
              <input type="number" name="height" className="form-input" value={calcData.height} onChange={handleCalcChange} required min="100" max="250" />
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Activity Level</label>
              <select name="activity" className="form-select" value={calcData.activity} onChange={handleCalcChange}>
                <option value="1.2">Sedentary (little to no exercise)</option>
                <option value="1.375">Lightly active (light exercise 1-3 days/week)</option>
                <option value="1.55">Moderately active (moderate exercise 3-5 days/week)</option>
                <option value="1.725">Very active (hard exercise 6-7 days/week)</option>
                <option value="1.9">Extra active (very hard exercise & physical job)</option>
              </select>
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Goal</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="goal" value="lose" checked={calcData.goal === 'lose'} onChange={handleCalcChange} />
                  Lose Weight
                </label>
                <label className="radio-label">
                  <input type="radio" name="goal" value="maintain" checked={calcData.goal === 'maintain'} onChange={handleCalcChange} />
                  Maintain
                </label>
                <label className="radio-label">
                  <input type="radio" name="goal" value="gain" checked={calcData.goal === 'gain'} onChange={handleCalcChange} />
                  Build Muscle
                </label>
              </div>
            </div>
          </div>
          
          <div className="action-row">
            <button type="submit" className="btn-secondary">Calculate TDEE</button>
          </div>
        </form>

        {calculatedTDEE && (
          <div className="calc-result animate-fade-in">
            <p className="calc-desc">Your estimated Total Daily Energy Expenditure is {calculatedTDEE} kcal.</p>
            <p className="calc-desc">Based on your goal, your suggested daily target is:</p>
            <div className="calc-value">{suggestedTarget} kcal</div>
            
            <button 
              className="btn-primary" 
              style={{ marginTop: '1rem' }}
              onClick={() => handleSaveTarget(suggestedTarget)}
              disabled={loading}
            >
              Set as My Target
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
