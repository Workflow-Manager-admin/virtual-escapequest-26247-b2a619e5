import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// PUBLIC_INTERFACE
function Timer({ initialTime, onExpire }) {
  /** 
   * This component displays and counts down the timer.
   */
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    if (time <= 0) {
      if (onExpire) onExpire();
      return;
    }
    const interval = setInterval(() => {
      setTime(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [time, onExpire]);

  // Format mm:ss
  const minutes = String(Math.floor(time / 60)).padStart(2, '0');
  const seconds = String(time % 60).padStart(2, '0');
  return (
    <div className="vesq-timer">
      <span role="img" aria-label="timer" style={{marginRight:4}}>⏳</span>
      {minutes}:{seconds}
    </div>
  );
}

// PUBLIC_INTERFACE
function Inventory({ items }) {
  /**
   * Shows collected items as a visual list.
   */
  return (
    <div className="vesq-inventory">
      <div className="vesq-inv-title">Inventory</div>
      {items.length === 0 ? <div className="vesq-no-items">No items</div> :
        <ul className="vesq-item-list">
          {items.map((item, idx) => (
            <li key={idx} className="vesq-item">
              <span>{item.icon}</span> {item.name}
            </li>
          ))}
        </ul>
      }
    </div>
  );
}

// PUBLIC_INTERFACE
function Hint({ onClick, available }) {
  /**
   * Hint button.
   */
  return (
    <button className="vesq-hint-btn" onClick={onClick} disabled={!available}>
      💡 Hint
    </button>
  );
}

// PUBLIC_INTERFACE
function Modal({ open, title, onClose, children }) {
  /**
   * Simple modal popup.
   */
  if (!open) return null;
  return (
    <div className="vesq-modal-backdrop" onClick={onClose}>
      <div className="vesq-modal" onClick={e => e.stopPropagation()}>
        <div className="vesq-modal-header">
          <span>{title}</span>
          <button className="vesq-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="vesq-modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Puzzle Data / Hint System / Hidden Objects */
const INITIAL_PUZZLES = [
  {
    id: 'riddle-book',
    trigger: 'book',
    type: 'riddle',
    question: <>What gets wetter as it dries?</>,
    answer: 'towel',
    clue: 'It's something you use after a shower.',
    solved: false,
    objectLabel: 'Old Book'
  },
  {
    id: 'math-note',
    trigger: 'note',
    type: 'math',
    question: <>Solve: (7 × 4) - 6 = ?</>,
    answer: '22',
    clue: 'Remember operator precedence. Seven times four...',
    solved: false,
    objectLabel: 'Scrap Paper'
  },
  {
    id: 'color-lock',
    trigger: 'safe',
    type: 'pattern',
    question: (
      <div>
        <div style={{marginBottom:8}}>The safe has three buttons in these colors:</div>
        <span style={{background:'#e94560',padding:'0 6px',borderRadius:4}}>Red</span>{' '}
        <span style={{background:'#16213e',color:'#fff',padding:'0 6px',borderRadius:4}}>Blue</span>{' '}
        <span style={{background:'#ffc300',color:'#333',padding:'0 6px',borderRadius:4}}>Yellow</span>
        <div style={{marginTop:6}}>Press them in order to match: Sun, Blood, Sky.</div>
        <div style={{fontSize:'0.95em',color:'var(--text-secondary)',marginTop:4}}>Enter a comma-separated color sequence (e.g. yellow,red,blue)</div>
      </div>
    ),
    answer: 'yellow,red,blue',
    clue: 'What color represents each thing? Sun: yellow, Blood: red, Sky: blue.',
    solved: false,
    objectLabel: 'Locked Safe'
  }
];

const HIDDEN_OBJECTS = [
  {
    name: 'Key',
    icon: '🔑',
    position: { left: '74%', top: '62%' }, // Percentage-based for responsive
    visible: true,
    clickAction: 'collect-key',
    hint: 'Check near the chest.'
  },
  {
    name: 'Note',
    icon: '📝',
    position: { left: '20%', top: '40%' },
    visible: true,
    clickAction: 'open-puzzle-math-note',
    hint: 'A paper sticks out under the desk.'
  },
  {
    name: 'Book',
    icon: '📖',
    position: { left: '55%', top: '23%' },
    visible: true,
    clickAction: 'open-puzzle-riddle-book',
    hint: 'An old book stands out on the shelf.'
  },
  {
    name: 'Safe',
    icon: '🧰',
    position: { left: '60%', top: '71%' },
    visible: true,
    clickAction: 'open-puzzle-color-lock',
    hint: 'A safe with colored buttons is on the floor.'
  }
];

// PUBLIC_INTERFACE
function RoomView({ onObjectClick, collected }) {
  /**
   * Central interactive room view.
   */
  // The "background" is a simple CSS layered effect to hint at an escape room.
  // Hidden objects are clickable zones placed absolutely.
  const objects = HIDDEN_OBJECTS.map(ho => ({
    ...ho,
    visible: ho.name !== 'Key' || !collected.some(i => i.name === 'Key')
  }));

  return (
    <div className="vesq-room-bg">
      <div className="vesq-room-ambient"></div>
      <div className="vesq-room-label">Escape Room</div>
      {objects.filter(o => o.visible).map((obj, idx) => (
        <button
          key={obj.name}
          className={`vesq-object-btn`}
          style={{
            position: 'absolute',
            left: obj.position.left,
            top: obj.position.top,
            zIndex: 2 + idx
          }}
          aria-label={`Click ${obj.name}`}
          onClick={() => onObjectClick(obj)}
        >
          <span style={{fontSize: '2em'}}>{obj.icon}</span>
        </button>
      ))}
      <div className="vesq-room-decor" aria-hidden>
        {/* Decorative non-interactive elements */}
        <div className="vesq-window"></div>
        <div className="vesq-shelf"></div>
        <div className="vesq-desk"></div>
        <div className="vesq-chest"></div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function EscapeQuestMain() {
  /**
   * Main game logic and container UI for Virtual EscapeQuest.
   */
  const [puzzles, setPuzzles] = useState(INITIAL_PUZZLES);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [collected, setCollected] = useState([]);
  const [timerExpired, setTimerExpired] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintPuzzle, setHintPuzzle] = useState(null);
  const [congratsOpen, setCongratsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const ambienceRef = useRef();

  // Puzzle answer states
  const [answerInput, setAnswerInput] = useState('');
  const [feedback, setFeedback] = useState('');

  // Start ambience sound
  useEffect(() => {
    if (ambienceRef.current) {
      if (soundOn) {
        ambienceRef.current.volume = 0.16;
        ambienceRef.current.loop = true;
        ambienceRef.current.play().catch(()=>{});
      } else {
        ambienceRef.current.pause();
      }
    }
  }, [soundOn]);

  // Check for escape (all puzzles solved + key collected)
  useEffect(() => {
    if (puzzles.every(p => p.solved) && collected.some(i => i.name === 'Key')) {
      setTimeout(() => setCongratsOpen(true), 350);
    }
  }, [puzzles, collected]);

  // PUBLIC_INTERFACE
  function handleObjectClick(obj) {
    if (obj.name === 'Key') {
      setCollected(prev =>
        prev.some(i => i.name === 'Key') ? prev : [...prev, { name: 'Key', icon: '🔑' }]
      );
      return;
    }
    if (obj.name === 'Book') {
      openPuzzle('riddle-book');
      return;
    }
    if (obj.name === 'Note') {
      openPuzzle('math-note');
      return;
    }
    if (obj.name === 'Safe') {
      openPuzzle('color-lock');
      return;
    }
  }

  // PUBLIC_INTERFACE
  function openPuzzle(puzzleId) {
    const puzzle = puzzles.find(p => p.id === puzzleId);
    setCurrentPuzzle(puzzle);
    setModalOpen(true);
    setAnswerInput('');
    setFeedback('');
  }

  // PUBLIC_INTERFACE
  function closeModal() {
    setModalOpen(false);
    setCurrentPuzzle(null);
    setFeedback('');
  }

  // PUBLIC_INTERFACE
  function submitPuzzleAnswer() {
    if (!currentPuzzle) return;
    let expected = currentPuzzle.answer.trim().toLowerCase();
    let val = answerInput.trim().toLowerCase();
    // Normalize for the color puzzle - remove spaces
    if (currentPuzzle.type === 'pattern') {
      expected = expected.replace(/\s/g, '');
      val = val.replace(/\s/g, '');
    }
    if (val === expected) {
      setFeedback('✅ Correct!');
      setPuzzles(pzls =>
        pzls.map(p =>
          p.id === currentPuzzle.id ? { ...p, solved: true } : p
        )
      );
      setTimeout(() => {
        closeModal();
      }, 1100);
    } else {
      setFeedback('❌ Try Again');
    }
  }

  // PUBLIC_INTERFACE
  function requestHint() {
    // Find first unsolved puzzle
    const unsolved = puzzles.find(p => !p.solved);
    if (unsolved) {
      setHintPuzzle(unsolved);
      setHintOpen(true);
    }
  }

  function closeHint() {
    setHintOpen(false);
    setHintPuzzle(null);
  }

  function handleTimerExpire() {
    setTimerExpired(true);
  }

  function toggleSound() {
    setSoundOn(!soundOn);
  }

  function resetGame() {
    setPuzzles(INITIAL_PUZZLES.map(p => ({...p})));
    setCollected([]);
    setModalOpen(false);
    setCurrentPuzzle(null);
    setHintOpen(false);
    setHintPuzzle(null);
    setCongratsOpen(false);
    setFeedback('');
    setAnswerInput('');
    setTimerExpired(false);
  }

  // Main layout
  return (
    <div className="vesq-main-container" style={{ background: 'linear-gradient(120deg, #1a1a2e 60%, #16213e 100%)', minHeight: '100vh' }}>
      <audio ref={ambienceRef} src="https://cdn.pixabay.com/audio/2023/03/29/audio_12b1745497.mp3" tabIndex={-1} autoPlay loop style={{ display: 'none' }} />
      {/* Navbar */}
      <nav className="navbar vesq-navbar" style={{background: '#1a1a2e', color:'#e94560', borderBottom: '2px solid #e94560', boxShadow:'0 0 14px #1a1a2ecc'}}>
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div className="logo" style={{fontWeight:800,letterSpacing:1}}>
            <span style={{color:'#e94560',fontWeight:900,fontSize:'1.55em'}}>⏳</span>
            Virtual EscapeQuest
          </div>
          <button
            className="btn"
            onClick={toggleSound}
            style={{
              background: soundOn ? '#e94560' : '#16213e',
              border: '1px solid #e94560',
              marginLeft: 12
            }}
          >
            {soundOn ? '🔊 Sound' : '🔈 Mute'}
          </button>
        </div>
      </nav>
      {/* Main Content */}
      <div className="vesq-content-layout">
        {/* Sidebar */}
        <aside className="vesq-sidebar">
          <Timer initialTime={10 * 60} onExpire={handleTimerExpire} />
          <Inventory items={collected} />
          <Hint onClick={requestHint} available={puzzles.some(p => !p.solved) && !hintOpen && !congratsOpen && !timerExpired} />
          <div className="vesq-progress-bar">
            Progress&nbsp;
            <span className="vesq-progress-pct">
            {Math.round(
              ((puzzles.filter(p=>p.solved).length + (collected.some(i=>i.name==='Key')?1:0)) / (puzzles.length+1)) * 100
            )}%
            </span>
          </div>
        </aside>
        {/* Central Room Area */}
        <main className="vesq-room-main">
          <RoomView onObjectClick={handleObjectClick} collected={collected} />
          <div className="vesq-game-tip">
            {congratsOpen ? <span style={{color:'#e94560'}}>🎉 Congratulations! You Escaped!</span>
             : timerExpired ? <span style={{color:'#e94560'}}>⏰ Time is up! Try again?</span>
              : <span>Click objects to explore the room. Solve puzzles and escape!</span>}
          </div>
          {(congratsOpen || timerExpired) &&
            <button className="btn btn-large vesq-game-restart" onClick={resetGame}>
              Restart Game
            </button>
          }
        </main>
      </div>
      {/* Puzzle Modal */}
      <Modal
        open={modalOpen}
        title={currentPuzzle ? currentPuzzle.objectLabel : ''}
        onClose={closeModal}
      >
        {currentPuzzle &&
          <form onSubmit={e => {e.preventDefault(); submitPuzzleAnswer();}}>
            <div className="vesq-puzzle-q">
              {currentPuzzle.id === 'color-lock'
                ? (
                  <div>
                    <div style={{marginBottom:8}}>The safe has three buttons in these colors:</div>
                    <span style={{background:'#e94560',padding:'0 6px',borderRadius:4}}>Red</span>{' '}
                    <span style={{background:'#16213e',color:'#fff',padding:'0 6px',borderRadius:4}}>Blue</span>{' '}
                    <span style={{background:'#ffc300',color:'#333',padding:'0 6px',borderRadius:4}}>Yellow</span>
                    <div style={{marginTop:6}}>Press them in order to match: Sun, Blood, Sky.</div>
                    <div style={{fontSize:'0.95em',color:'var(--text-secondary)',marginTop:4}}>
                      Enter a comma-separated color sequence (e.g. yellow,red,blue)
                    </div>
                  </div>
                )
                : currentPuzzle.question}
            </div>
            <input
              className="vesq-input"
              type="text"
              value={answerInput}
              disabled={currentPuzzle.solved}
              autoFocus
              onChange={e => setAnswerInput(e.target.value)}
              placeholder="Enter your answer"
              style={{margin:'12px 0', width:'96%',fontSize:'1rem',padding:'8px'}}
            />
            {feedback && <div className="vesq-puzzle-feedback">{feedback}</div>}
            {!currentPuzzle.solved &&
              <button type="submit" className="btn btn-large vesq-submit-btn" style={{width:'100%',marginTop:12,background:'#e94560'}}>Submit</button>
            }
            {currentPuzzle.solved && <div className="vesq-puzzle-feedback" style={{ color: "#0f0" }}>Solved!</div>}
          </form>
        }
      </Modal>
      {/* Hint Modal */}
      <Modal
        open={hintOpen}
        title="Hint"
        onClose={closeHint}
      >
        {hintPuzzle && (
          <div className="vesq-hint-modal-body">
            <div><span style={{color:'#e94560',fontWeight:600}}>Puzzle:</span> {hintPuzzle.objectLabel}</div>
            <div style={{marginTop:10, color:'#fff'}}>{hintPuzzle.clue}</div>
          </div>
        )}
      </Modal>
      {/* Congrats Modal */}
      <Modal
        open={congratsOpen}
        title="Congratulations!"
        onClose={()=>setCongratsOpen(false)}
      >
        <div style={{fontWeight:600, color:'#e94560', fontSize:'1.2em', marginBottom:8}}>
          🎉 You have escaped the room!
        </div>
        <div style={{color:'#fff'}}>Play again or challenge a friend to beat your time.</div>
        <button className="btn vesq-game-restart" onClick={resetGame} style={{marginTop:18}}>Play Again</button>
      </Modal>
      {/* Timer expire modal */}
      <Modal
        open={timerExpired}
        title="Time's Up!"
        onClose={()=>setTimerExpired(false)}
      >
        <div style={{fontWeight:600, color:'#e94560', fontSize:'1.15em', marginBottom:8}}>
          ⏰ Oh no, you ran out of time!
        </div>
        <div style={{color:'#fff'}}>Try again to solve all puzzles before the timer runs out.</div>
        <button className="btn vesq-game-restart" onClick={resetGame} style={{marginTop:18}}>Restart</button>
      </Modal>
    </div>
  );
}

// Main App export
function App() {
  // PUBLIC_INTERFACE
  return <EscapeQuestMain />;
}

export default App;
