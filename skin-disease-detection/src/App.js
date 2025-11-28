import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('diagnosis');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentCamera, setCurrentCamera] = useState('environment');
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    setChatHistory([{
      role: 'bot',
      text: 'Hello! I am your AI skin health assistant. Ask me about skin conditions!'
    }]);
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = (facingMode) => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsCameraActive(true);
      setError('');
      
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode || 'environment' }, 
        audio: false 
      })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setCurrentCamera(facingMode || 'environment');
          }
        })
        .catch(err => {
          setError('Camera access denied. Please allow camera permissions.');
          setIsCameraActive(false);
        });
    } else {
      setError('Camera not supported in this browser.');
    }
  };

  const switchCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    const newCamera = currentCamera === 'environment' ? 'user' : 'environment';
    startCamera(newCamera);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const capturedImage = canvasRef.current.toDataURL('image/jpeg');
      setImage(capturedImage);
      setResult(null);
      setError('');
      stopCamera();
    }
  };

  const analyzeImage = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const base64 = image.split(',')[1];
      
      const data = {
        contents: [{
          role: "user",
          parts: [
            { text: "Analyze this skin image. Provide disease name, confidence score, description, and medical disclaimer." },
            { inlineData: { mimeType: "image/jpeg", data: base64 } }
          ]
        }]
      };

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDHCEaLhGNsVgcbomKHetHRSC-y7nKIHXo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      );

      const json = await response.json();
      
      if (json.candidates && json.candidates[0]) {
        const text = json.candidates[0].content.parts[0].text;
        setResult({ analysis: text, timestamp: new Date().toLocaleString() });
      } else {
        setError('No analysis received from AI');
      }

    } catch (err) {
      setError('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (userMessage.trim() === '') return;

    const newMessage = { role: 'user', text: userMessage };
    setChatHistory(prev => [...prev, newMessage]);
    setUserMessage('');
    setIsChatting(true);

    try {
      const prompt = 'Answer this skin health question: "' + userMessage + '". Provide helpful information but remind users to consult healthcare professionals.';
      
      const data = {
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      };

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDHCEaLhGNsVgcbomKHetHRSC-y7nKIHXo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      );

      const json = await response.json();
      
      if (json.candidates && json.candidates[0]) {
        const botMessage = json.candidates[0].content.parts[0].text;
        setChatHistory(prev => [...prev, { role: 'bot', text: botMessage }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'bot', text: 'Sorry, I could not process your question.' }]);
      }

    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'bot', text: 'I am experiencing technical difficulties.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🩺</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 15px 0' }}>
            Arogya Mitra
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: '0.9' }}>
            AI-Powered Skin Health Analysis & Assistant
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '15px', padding: '5px' }}>
            <button
              onClick={() => setActiveTab('diagnosis')}
              style={{
                padding: '12px 25px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'diagnosis' ? 'white' : 'transparent',
                color: activeTab === 'diagnosis' ? '#333' : 'white',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '5px'
              }}
            >
              🔬 Skin Analysis
            </button>
            <button
              onClick={() => setActiveTab('chatbot')}
              style={{
                padding: '12px 25px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'chatbot' ? 'white' : 'transparent',
                color: activeTab === 'chatbot' ? '#333' : 'white',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🤖 AI Assistant
            </button>
          </div>
        </div>

        {activeTab === 'diagnosis' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '25px' }}>
            
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '25px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', textAlign: 'center', marginBottom: '20px' }}>
                📸 Upload or Capture Image
              </h2>

              <div style={{
                border: '3px dashed #ccc',
                borderRadius: '15px',
                padding: '25px',
                textAlign: 'center',
                marginBottom: '20px',
                minHeight: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isCameraActive ? (
                  <div style={{ width: '100%' }}>
                    <video 
                      ref={videoRef} 
                      style={{ width: '100%', maxHeight: '220px', borderRadius: '10px', objectFit: 'cover' }} 
                      autoPlay 
                      playsInline
                      muted
                    ></video>
                    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                  </div>
                ) : image ? (
                  <div>
                    <img src={image} alt="Preview" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '10px' }} />
                    <p style={{ marginTop: '15px', color: '#10b981', fontWeight: '600' }}>
                      ✅ Image ready for analysis
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>📷</div>
                    <p style={{ fontSize: '1.1rem', color: '#666', fontWeight: '500' }}>
                      Upload image or use camera
                    </p>
                  </div>
                )}
              </div>

              <input type="file" accept="image/*" onChange={handleFileSelect} ref={fileRef} style={{ display: 'none' }} />

              {isCameraActive ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <button
                    onClick={capturePhoto}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  >
                    📸 Capture
                  </button>
                  <button
                    onClick={switchCamera}
                    style={{
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  >
                    🔄 Flip
                  </button>
                  <button
                    onClick={stopCamera}
                    style={{
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  >
                    ❌ Close
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <button
                    onClick={() => fileRef.current.click()}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    📁 Upload
                  </button>
                  <button
                    onClick={() => startCamera('environment')}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    📷 Camera
                  </button>
                  {!isMobile && (
                    <button
                      onClick={analyzeImage}
                      disabled={!image || loading}
                      style={{
                        background: loading || !image ? '#ccc' : '#667eea',
                        color: 'white',
                        border: 'none',
                        padding: '14px',
                        borderRadius: '10px',
                        cursor: loading || !image ? 'not-allowed' : 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      {loading ? '🔍 Analyzing...' : '🧠 Analyze'}
                    </button>
                  )}
                </div>
              )}

              {isMobile && !isCameraActive && (
                <button
                  onClick={analyzeImage}
                  disabled={!image || loading}
                  style={{
                    background: loading || !image ? '#ccc' : '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: loading || !image ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    width: '100%',
                    marginBottom: '20px'
                  }}
                >
                  {loading ? '🔍 Analyzing...' : '🧠 Analyze with AI'}
                </button>
              )}

              <div style={{ padding: '15px', backgroundColor: '#fffbeb', borderRadius: '10px' }}>
                <h4 style={{ color: '#92400e', marginBottom: '10px' }}>💡 Tips:</h4>
                <ul style={{ fontSize: '0.9rem', color: '#78350f', paddingLeft: '20px' }}>
                  <li>Use good lighting</li>
                  <li>Keep image clear and focused</li>
                  <li>Show affected area clearly</li>
                </ul>
              </div>
            </div>

            {(result || error || loading) && (
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '25px' }}>
                {loading && (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔍</div>
                    <h3>AI is analyzing...</h3>
                  </div>
                )}

                {error && (
                  <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>❌</div>
                    <h3 style={{ color: '#dc2626' }}>Error</h3>
                    <p style={{ color: '#7f1d1d' }}>{error}</p>
                  </div>
                )}

                {result && (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
                      <h2 style={{ color: '#059669' }}>Analysis Complete</h2>
                    </div>
                    <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '10px', marginBottom: '15px' }}>
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'Georgia, serif',
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        margin: 0
                      }}>
                        {result.analysis}
                      </pre>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666', textAlign: 'right', marginBottom: '15px' }}>
                      🕒 {result.timestamp}
                    </div>
                    <div style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '10px' }}>
                      <h4 style={{ color: '#92400e' }}>⚠️ Medical Disclaimer</h4>
                      <p style={{ color: '#78350f', fontSize: '0.9rem' }}>
                        This analysis is for educational purposes only. Always consult a healthcare professional.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chatbot' && (
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '25px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🤖</div>
              <h2>AI Skin Health Assistant</h2>
              <p style={{ color: '#666' }}>Ask me about skin conditions and treatments</p>
            </div>

            <div 
              ref={chatRef}
              style={{
                height: '350px',
                overflowY: 'auto',
                border: '2px solid #e5e7eb',
                borderRadius: '15px',
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: '#f9fafb'
              }}
            >
              {chatHistory.map((msg, index) => (
                <div 
                  key={index} 
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '15px'
                  }}
                >
                  <div style={{
                    maxWidth: '75%',
                    padding: '12px 16px',
                    borderRadius: '18px',
                    backgroundColor: msg.role === 'user' ? '#667eea' : '#e5e7eb',
                    color: msg.role === 'user' ? 'white' : '#333',
                    wordWrap: 'break-word'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isChatting && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '18px',
                    backgroundColor: '#e5e7eb',
                    color: '#333'
                  }}>
                    Typing...
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about skin conditions..."
                disabled={isChatting}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isChatting || userMessage.trim() === ''}
                style={{
                  background: isChatting || userMessage.trim() === '' ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  cursor: isChatting || userMessage.trim() === '' ? 'not-allowed' : 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                🚀
              </button>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '10px' }}>
              <h4 style={{ color: '#0369a1', marginBottom: '10px' }}>💬 Try asking:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => setUserMessage('What causes acne?')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#0369a1',
                    textAlign: 'left',
                    fontSize: '0.9rem'
                  }}
                >
                  What causes acne?
                </button>
                <button
                  onClick={() => setUserMessage('How to care for dry skin?')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#0369a1',
                    textAlign: 'left',
                    fontSize: '0.9rem'
                  }}
                >
                  Dry skin care tips?
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '40px', color: 'rgba(255,255,255,0.8)' }}>
          <p>Made with ❤️ using Google Gemini AI</p>
        </div>
      </div>
    </div>
  );
}

export default App;
