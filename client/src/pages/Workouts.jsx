import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Mic, MicOff, Plus, Trash2, Dumbbell, RefreshCcw } from 'lucide-react';
import '../styles/Workouts.css';

const Workouts = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const isManualStop = useRef(false);
  const transcriptRef = useRef('');

  useEffect(() => {
    fetchWorkouts();
    setupSpeechRecognition();
  }, []);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workouts');
      setWorkouts(res.data.workouts || []);
    } catch (err) {
      setError('Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  const setupSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;

      recog.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        transcriptRef.current = currentTranscript;
      };

      recog.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        setError(`Microphone error: ${event.error}`);
      };

      recog.onend = () => {
        setIsRecording(false);
        // If it stopped unexpectedly (especially on mobile) and we have a transcript, process it
        if (!isManualStop.current && transcriptRef.current.trim()) {
          processTranscript(transcriptRef.current);
        }
      };

      setRecognition(recog);
    } else {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }
  };

  const toggleRecording = () => {
    if (!recognition) return;

    if (isRecording) {
      isManualStop.current = true;
      recognition.stop();
      setIsRecording(false);
      if (transcript) {
        processTranscript(transcript);
      }
    } else {
      isManualStop.current = false;
      setTranscript('');
      transcriptRef.current = '';
      setError('');
      recognition.start();
      setIsRecording(true);
    }
  };

  const processTranscript = async (text) => {
    if (!text.trim()) return;
    
    try {
      setParsing(true);
      const parseRes = await api.post('/workouts/parse-voice', { transcript: text });
      
      const saveRes = await api.post('/workouts', {
        name: parseRes.data.name || 'Voice Logged Workout',
        exercises: parseRes.data.exercises || []
      });
      
      setWorkouts([saveRes.data, ...workouts]);
      setTranscript('');
      transcriptRef.current = '';
    } catch (err) {
      setError('Failed to process workout from voice');
    } finally {
      setParsing(false);
    }
  };

  const confirmDelete = async (id) => {
    try {
      await api.delete(`/workouts/${id}`);
      setWorkouts((prevWorkouts) => prevWorkouts.filter(w => w._id !== id));
      setDeletingId(null);
    } catch (err) {
      setError('Failed to delete workout');
      setDeletingId(null);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    
    const textToProcess = manualText;
    setManualText('');
    setShowManualInput(false);
    await processTranscript(textToProcess);
  };

  return (
    <div>
      <header className="page-header-row">
        <div>
          <h1 className="page-title">Workout Tracker</h1>
          <p className="page-subtitle">Log your sets and reps effortlessly using your voice or text.</p>
        </div>
      </header>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {/* Voice Input Card */}
      <div className={`card voice-card ${isRecording ? 'recording' : ''}`}>
        <div className="mic-container">
          <button
            onClick={toggleRecording}
            className={`mic-btn ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? <MicOff size={40} /> : <Mic size={40} />}
          </button>

          <h3 className="voice-title">
            {isRecording ? 'Listening...' : 'Tap Mic to Log Workout'}
          </h3>
          <p className="voice-hint">
            Say something like "Bench press 3 sets of 10 at 60 kg, then Squats 4 sets of 8 at 100"
          </p>

          {(transcript || parsing) && (
            <div className="transcript-box">
              {parsing ? (
                <div className="parsing-status">
                  <RefreshCcw className="spin-icon" size={18} />
                  <span>Parsing exercises and sets...</span>
                </div>
              ) : (
                <p className="transcript-text">"{transcript}"</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Workouts List */}
      <div>
        <div className="history-header">
          <h2 className="history-title">History</h2>
          <button className="manual-add-btn" onClick={() => setShowManualInput(!showManualInput)}>
            <Plus size={16} /> {showManualInput ? 'Cancel' : 'Manual Add'}
          </button>
        </div>

        {showManualInput && (
          <form className="card manual-input-card" onSubmit={handleManualSubmit}>
            <input 
              type="text" 
              placeholder='Type workout (e.g. "Bench press 3 sets of 10 at 60 kg")'
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="manual-text-input"
              autoFocus
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Log</button>
          </form>
        )}

        {loading ? (
          <div>Loading...</div>
        ) : workouts.length === 0 ? (
          <div className="card empty-state">
            <Dumbbell className="empty-icon" size={48} />
            <p className="empty-text">No workouts recorded yet.</p>
            <p className="empty-subtext">Tap the microphone to start logging.</p>
          </div>
        ) : (
          <div>
            {workouts.map(workout => (
              <div key={workout._id} className="card workout-log-card">
                <div className="workout-indicator"></div>
                
                <div className="workout-header">
                  <div>
                    <h3 className="workout-name">{workout.name}</h3>
                    <p className="workout-date">
                      {new Date(workout.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="workout-actions">
                    {deletingId === workout._id ? (
                      <div className="delete-confirm-group">
                        <button onClick={() => confirmDelete(workout._id)} className="confirm-delete-btn">Confirm</button>
                        <button onClick={() => setDeletingId(null)} className="cancel-delete-btn">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(workout._id)} className="workout-delete">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="workout-body">
                  {workout.exercises && workout.exercises.length > 0 ? (
                    <div className="exercises-list">
                      {workout.exercises.map((exercise, idx) => (
                        <div key={idx} className="exercise-block">
                          <h4 className="exercise-name">{exercise.name}</h4>
                          <div className="sets-header">
                            <div>Set</div>
                            <div>Reps</div>
                            <div>Weight</div>
                          </div>
                          <div className="sets-list">
                            {exercise.sets.map((set, setIdx) => (
                              <div key={setIdx} className="set-row">
                                <div className="set-number">{setIdx + 1}</div>
                                <div className="set-value">{set.reps}</div>
                                <div className="set-value">{set.weight > 0 ? `${set.weight} kg` : '-'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-exercises">
                      No recognized exercises in this log.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workouts;
