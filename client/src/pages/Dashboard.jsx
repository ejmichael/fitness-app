import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Target, Flame, Dumbbell, ArrowRight, Zap, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mealTotals, setMealTotals] = useState({ calories: 0, protein: 0 });
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [workoutStats, setWorkoutStats] = useState({ streak: 0, activity: [] });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [mealsRes, workoutsRes] = await Promise.all([
          api.get('/meals'),
          api.get('/workouts'),
        ]);
        
        setMealTotals(mealsRes.data.totals || { calories: 0, protein: 0 });
        setRecentWorkouts(workoutsRes.data.workouts?.slice(0, 3) || []);
        setWorkoutStats(workoutsRes.data.stats || { streak: 0, activity: [] });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const calorieProgress = Math.min((mealTotals.calories / (user?.calorieTarget || 2000)) * 100, 100);

  // Activity logic for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toDateString();
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Welcome Back, {user?.name?.split(' ')[0]}</h1>
        <p className="page-subtitle">Here's your fitness overview for today.</p>
      </header>

      <div className="dashboard-grid">
        {/* Calorie Card */}
        <div className="card calorie-card">
          <div className="calorie-card-bg"></div>
          
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Flame size={20} className="text-indigo-400" />
                Daily Calories
              </h2>
              <p className="text-gray-400 text-sm">Target: {user?.calorieTarget || 2000} kcal</p>
            </div>
            <Link to="/meals" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
              Log Meal <ArrowRight size={16} />
            </Link>
          </div>

          <div className="calorie-content">
            <div className="ring-container">
              <svg className="progress-ring">
                <circle cx="80" cy="80" r="70" strokeWidth="12" fill="transparent" className="progress-ring-bg" />
                <circle
                  cx="80" cy="80" r="70"
                  strokeWidth="12" fill="transparent"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * calorieProgress) / 100}
                  className="progress-ring-fill"
                  strokeLinecap="round"
                />
              </svg>
              <div className="ring-text">
                <span className="ring-value">{mealTotals.calories}</span>
                <span className="ring-label">consumed</span>
              </div>
            </div>

            <div className="calorie-stats">
              <div>
                <div className="stat-row">
                  <span style={{ color: 'var(--text-muted)' }}>Remaining</span>
                  <span style={{ fontWeight: 500, color: 'white' }}>{Math.max((user?.calorieTarget || 2000) - mealTotals.calories, 0)} kcal</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${100 - calorieProgress}%` }}></div>
                </div>
              </div>
              
              <div className="macro-grid mt-4">
                <div className="macro-box">
                  <p className="macro-label">Protein</p>
                  <p className="macro-value">{Math.round(mealTotals.protein)}g</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-side">
          {/* Quick Actions Action */}
          <div className="card quick-actions-card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'white', margin: '0 0 0.5rem 0' }}>Quick Actions</h2>
            <Link to="/meals" className="action-btn primary">
               <Target size={24} />
               <span>Log a Meal via Image</span>
            </Link>
            <Link to="/workouts" className="action-btn emerald">
               <Dumbbell size={24} />
               <span>Log Workout via Voice</span>
            </Link>
          </div>

          {/* Streak Card */}
          <div className="card streak-card mt-4">
            <div className="streak-content">
              <div className="streak-icon-box">
                <Zap size={32} className={workoutStats.streak > 0 ? 'text-yellow-400 active-zap' : 'text-gray-600'} />
              </div>
              <div className="streak-text">
                <p className="streak-count">{workoutStats.streak} Day Streak</p>
                <p className="streak-subtext">
                  {workoutStats.streak > 0 ? "You're on fire! Keep it up." : "Start a streak today!"}
                </p>
              </div>
            </div>
          </div>

          {/* Weekly Activity */}
          <div className="card activity-card mt-4">
            <h3 className="card-title mb-4">
              <Calendar size={18} className="text-emerald-400" />
              Weekly Activity
            </h3>
            <div className="activity-dots">
              {last7Days.map((day, i) => {
                const hasWorkout = workoutStats.activity?.includes(day);
                return (
                  <div key={i} className="activity-dot-wrapper">
                    <div className={`activity-dot ${hasWorkout ? 'active' : ''}`}></div>
                    <span className="activity-label">{day.split(' ')[0][0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Workouts */}
      <h2 className="section-title">
        <Dumbbell size={20} style={{ color: 'var(--accent)' }} />
        Recent Activity
      </h2>
      <div className="recent-grid">
         {recentWorkouts.length === 0 ? (
           <p style={{ color: 'var(--text-muted)' }}>No workouts logged yet today.</p>
         ) : (
           recentWorkouts.map((workout) => (
             <div key={workout._id} className="card workout-item">
                <div>
                   <h3 className="workout-name">{workout.name}</h3>
                   <p className="workout-meta">{workout.exercises?.length || 0} exercises</p>
                </div>
                <Link to="/workouts" className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>View</Link>
             </div>
           ))
         )}
      </div>
    </div>
  );
};

export default Dashboard;
