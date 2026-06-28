import { useState, useRef, useEffect } from 'react';
import api from '../api/axios.js';

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your AI CV Assistant. I can help you:\n- Create a new CV from scratch\n- Improve your existing CV\n- Optimize your CV for ATS systems\n- Match your CV to specific job descriptions\n\nWhat would you like to do?",
      sender: 'bot',
      actions: [
        { label: 'Create New CV', action: 'create' },
        { label: 'Improve Existing CV', action: 'improve' },
        { label: 'Optimize for ATS', action: 'optimize' }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('menu');
  const [cvData, setCvData] = useState(null);
  const messagesEndRef = useRef(null);
  const nextMessageIdRef = useRef(2);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text, sender = 'user', actions = null) => {
    setMessages(prev => [...prev, {
      id: nextMessageIdRef.current++,
      text,
      sender,
      actions
    }]);
  };

  const handleAction = async (action) => {
    addMessage(`I want to ${action.label.toLowerCase()}.`, 'user');

    switch (action.action) {
      case 'create':
        setCurrentStep('create_intro');
        addMessage(
          "Great! Let's create your new CV. I'll ask you some questions to build a professional resume.\n\nWhat's your full name and professional title/role? (e.g., John Doe - Senior Software Engineer)",
          'bot',
          null
        );
        break;

      case 'improve':
        setCurrentStep('improve_intro');
        addMessage(
          "Perfect! I'll help improve your existing CV. Do you want to:\n\n1. Upload your current CV\n2. Paste your CV text here\n3. Describe your experience and I'll create an improved version",
          'bot',
          [
            { label: 'Upload CV', action: 'upload_cv' },
            { label: 'Paste Text', action: 'paste_cv' },
            { label: 'Describe Experience', action: 'describe_exp' }
          ]
        );
        break;

      case 'optimize':
        setCurrentStep('optimize_intro');
        addMessage(
          "Let's optimize your CV for ATS systems! First, do you have a job description you want to match against?\n\nYou can paste the job description and I'll analyze how to optimize your CV to match it.",
          'bot',
          null
        );
        break;

      default:
        break;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    addMessage(userMessage, 'user');
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat', {
        message: userMessage,
        step: currentStep,
        cvData
      });

      const { reply, nextStep, updatedCvData, actions } = response.data;
      addMessage(reply, 'bot', actions);
      setCurrentStep(nextStep || currentStep);
      if (updatedCvData) setCvData(updatedCvData);

    } catch (error) {
      addMessage('Sorry, something went wrong. Please try again.', 'bot');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/chat/upload-cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      addMessage(`CV uploaded and analyzed!`, 'user');
      addMessage(response.data.reply, 'bot', response.data.actions);
      setCvData(response.data.cvData);
      setCurrentStep(response.data.nextStep);

    } catch (error) {
      addMessage('Failed to upload CV. Please try again.', 'bot');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCV = async () => {
    if (!cvData) {
      addMessage('No CV data to generate. Please provide your information first.', 'bot');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/chat/generate-cv', { cvData }, {
        responseType: 'blob'
      });
      
      // Download the generated CV
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      addMessage('Your CV has been generated and downloaded.', 'bot', [
        { label: 'Start Over', action: 'reset' }
      ]);

    } catch (error) {
      addMessage('Failed to generate CV. Please try again.', 'bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">AI CV Assistant</h1>
        <p className="text-sm text-gray-600 mt-1">Create, improve, and optimize your resume with AI</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((msg, index) => (
          <div key={`${msg.id}-${index}`} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white border border-gray-200'} rounded-lg px-4 py-3 shadow-sm`}>
              <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
              
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (action.action === 'reset') {
                          setMessages([messages[0]]);
                          setCurrentStep('menu');
                          setCvData(null);
                        } else if (action.action === 'generate') {
                          handleGenerateCV();
                        } else {
                          handleAction(action);
                        }
                      }}
                      className={`w-full text-xs font-medium py-2 px-3 rounded transition ${
                        msg.sender === 'user'
                          ? 'bg-opacity-20 bg-white text-white hover:bg-opacity-30'
                          : 'bg-primary text-white hover:bg-opacity-90'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          {currentStep.includes('improve') && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleUploadCV}
                className="hidden"
              />
              <div className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition">
                Attach CV
              </div>
            </label>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or details..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">Tip: Be detailed with your information for better CV generation.</p>
      </div>
    </div>
  );
};

export default ChatBot;
