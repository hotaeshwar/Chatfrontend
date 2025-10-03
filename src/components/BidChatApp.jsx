import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Smile, Image, Video, Music, FileText, MapPin, ChevronDown, Users, MessageCircle, Lock, Globe, X, Menu } from 'lucide-react';
import bidLogo from '../assets/images/bid-logo.png';

const BidChatApp = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [messageHistoryLoaded, setMessageHistoryLoaded] = useState(0);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('public');
  const [chatMode, setChatMode] = useState('group');
  const [userRooms, setUserRooms] = useState([]);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState(null);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRefs = useRef({
    image: null,
    video: null,
    audio: null,
    document: null
  });

  const API_BASE_URL = 'https://chat.buildingindiadigital.com';
  const WS_BASE_URL = 'wss://chat.buildingindiadigital.com';

  const emojis = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','🔥','⚡','💥','✨','🌟','⭐','🎉','🎊','🎁','🏆','🥇','🥈','🥉'];

  useEffect(() => {
    if (userId && !ws) {
      const websocket = new WebSocket(`${WS_BASE_URL}/ws/${userId}`);
      
      websocket.onopen = () => {
        console.log('Connected to WebSocket');
      };

      websocket.onmessage = (event) => {
        handleIncomingMessage(JSON.parse(event.data));
      };

      websocket.onclose = () => {
        addSystemMessage('Connection lost');
      };

      websocket.onerror = () => {
        addSystemMessage('Connection error');
      };

      setWs(websocket);

      return () => {
        websocket.close();
      };
    }
  }, [userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100);
    }
  };

  const handleIncomingMessage = (data) => {
    console.log('Received:', data);
    
    switch (data.type) {
      case 'connection':
        addSystemMessage('You joined - Your chats are secure');
        break;
      
      case 'rooms_list':
        setUserRooms(data.rooms || []);
        break;
      
      case 'chat_history':
        if (data.messages && data.messages.length > 0) {
          const roomId = data.room_id || 'public';
          if (roomId === currentRoom) {
            setMessageHistoryLoaded(data.count);
            addSystemMessage(`${data.count} previous messages loaded`);
            setMessages(prev => [...data.messages.filter(msg => msg.type === 'message'), ...prev]);
            if (data.count >= 50) {
              setShowLoadMore(true);
            }
          }
        }
        break;
      
      case 'online_users':
        const newUsers = new Map();
        data.users.forEach(user => {
          if (user !== userId) {
            newUsers.set(user, { online: true });
          }
        });
        setOnlineUsers(newUsers);
        break;
      
      case 'user_joined':
        if (data.user_id !== userId && data.room_id === 'public') {
          setOnlineUsers(prev => new Map(prev).set(data.user_id, { online: true }));
          if (currentRoom === 'public') {
            addSystemMessage(`${data.user_id} joined`);
          }
        }
        break;
      
      case 'user_left':
        if (data.room_id === 'public') {
          setOnlineUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(data.user_id);
            return newMap;
          });
          if (currentRoom === 'public') {
            addSystemMessage(`${data.user_id} left`);
          }
        }
        break;
      
      case 'message':
        const msgRoom = data.room_id || 'public';
        if (msgRoom === currentRoom) {
          setMessages(prev => [...prev, data]);
        }
        break;
      
      case 'error':
        addSystemMessage(`Error: ${data.message}`);
        break;
      
      default:
        break;
    }
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      type: 'system',
      content: text,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setUserId(username.trim());
      setIsLoggedIn(true);
    } else {
      alert('Please enter your name');
    }
  };

  const startPrivateChat = async (targetUser) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/private?user1=${userId}&user2=${targetUser}`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        setCurrentRoom(result.room_id);
        setSelectedPrivateUser(targetUser);
        setChatMode('private');
        setMessages([]);
        loadRoomHistory(result.room_id);
        addSystemMessage(`Secure private chat with ${targetUser}`);
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error('Error creating private chat:', error);
      alert('Failed to create private chat');
    }
  };

  const loadRoomHistory = async (roomId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/history?user_id=${userId}&limit=100`);
      const result = await response.json();
      
      if (result.success && result.messages) {
        setMessages(result.messages.filter(msg => msg.type === 'message'));
      }
    } catch (error) {
      console.error('Error loading room history:', error);
      if (error.message && error.message.includes('403')) {
        addSystemMessage('Access denied to this room');
      }
    }
  };

  const switchToGroupChat = () => {
    setCurrentRoom('public');
    setChatMode('group');
    setSelectedPrivateUser(null);
    setMessages([]);
    loadRoomHistory('public');
    addSystemMessage('Switched to public group chat');
    setIsSidebarOpen(false);
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    const data = {
      message_type: 'text',
      content: messageInput.trim(),
      room_id: currentRoom
    };

    ws.send(JSON.stringify(data));
    
    setMessageInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && ws && ws.readyState === WebSocket.OPEN) {
        const data = {
          message_type: result.file_type,
          file_url: result.file_url,
          filename: result.filename,
          file_size: result.file_size,
          caption: '',
          room_id: currentRoom
        };

        ws.send(JSON.stringify(data));
        console.log('File uploaded and sent:', data);
      } else {
        alert('Upload failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    }

    setShowAttachMenu(false);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const locationData = await response.json();
          if (locationData.display_name) {
            address = locationData.display_name;
          }
        } catch (e) {
          console.log('Could not get address');
        }

        const data = {
          message_type: 'location',
          latitude,
          longitude,
          address,
          room_id: currentRoom
        };

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }

        setShowAttachMenu(false);
      },
      () => {
        alert('Unable to get location. Please enable location access.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const loadOlderMessages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${currentRoom}/history?user_id=${userId}&limit=100`);
      const result = await response.json();
      
      if (result.success && result.messages.length > messageHistoryLoaded) {
        const olderMessages = result.messages.slice(0, result.messages.length - messageHistoryLoaded);
        setMessages(prev => [...olderMessages.filter(msg => msg.type === 'message'), ...prev]);
        setMessageHistoryLoaded(result.messages.length);
        
        if (result.messages.length < 100) {
          setShowLoadMore(false);
          addSystemMessage('No more messages');
        }
      } else {
        setShowLoadMore(false);
        addSystemMessage('No more messages');
      }
    } catch (error) {
      console.error('Error loading history:', error);
      addSystemMessage('Failed to load messages');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setMessageInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatar = (name) => {
    return name.charAt(0).toUpperCase();
  };

  const renderMessageContent = (msg) => {
    switch (msg.message_type) {
      case 'text':
        return <p className="text-sm leading-relaxed break-words">{msg.content}</p>;
      
      case 'image':
        return (
          <div>
            <img 
              src={msg.file_url} 
              alt={msg.filename || "Shared image"}
              className="rounded-lg max-w-full w-full sm:max-w-sm md:max-w-md mb-2 cursor-pointer hover:opacity-90 transition"
              onClick={() => window.open(msg.file_url, '_blank')}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div style={{display: 'none'}} className="text-red-500 text-xs">Failed to load image</div>
            {msg.caption && <p className="text-sm mt-1">{msg.caption}</p>}
          </div>
        );
      
      case 'video':
        return (
          <div>
            <video controls className="rounded-lg max-w-full w-full sm:max-w-sm md:max-w-md mb-2">
              <source src={msg.file_url} />
              Your browser does not support video playback
            </video>
            {msg.caption && <p className="text-sm mt-1">{msg.caption}</p>}
          </div>
        );
      
      case 'audio':
        return (
          <div>
            <audio controls className="mb-2 w-full max-w-sm">
              <source src={msg.file_url} />
              Your browser does not support audio playback
            </audio>
            {msg.caption && <p className="text-sm mt-1">{msg.caption}</p>}
          </div>
        );
      
      case 'document':
      case 'file':
        return (
          <a 
            href={msg.file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 bg-white bg-opacity-10 p-3 rounded-lg hover:bg-opacity-20 transition"
          >
            <FileText className="w-8 h-8 text-blue-400" />
            <div className="text-left">
              <p className="text-sm font-medium">{msg.filename || 'File'}</p>
              <p className="text-xs opacity-60">{formatFileSize(msg.file_size)}</p>
            </div>
          </a>
        );
      
      case 'location':
        return (
          <a 
            href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gray-100 p-3 rounded-lg hover:bg-gray-200 transition border border-gray-300"
          >
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="w-5 h-5 text-red-500" />
              <span className="text-sm font-semibold text-gray-900">Location Shared</span>
            </div>
            <p className="text-xs text-gray-700">{msg.address}</p>
            <p className="text-xs text-gray-600 mt-1">
              Lat: {msg.latitude.toFixed(6)}, Lng: {msg.longitude.toFixed(6)}
            </p>
          </a>
        );
      
      default:
        return null;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-800 via-teal-700 to-teal-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-200">
            <div className="text-center mb-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg p-2">
                <img src={bidLogo} alt="BiD Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-teal-600 mb-2">
                BiD Chat
              </h1>
              <p className="text-gray-600 text-sm mb-1">Connect, Share, Collaborate</p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mt-3">
                <Lock className="w-3 h-3" />
                <span>Secure & Private</span>
              </div>
            </div>
            
            <form onSubmit={handleLogin}>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 mb-4 transition"
              />
              <button 
                type="submit"
                className="w-full py-3 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Chatting
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex items-center justify-center p-0">
      <div className="w-full h-full max-w-7xl mx-auto flex bg-white overflow-hidden relative">
        
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className={`
          fixed lg:relative inset-y-0 left-0 z-50
          w-80 sm:w-96 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4 border-b border-gray-200 bg-teal-600">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 shadow-md">
                  <img src={bidLogo} alt="BiD" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">BiD Chat</h1>
                  <div className="flex items-center space-x-1 text-xs text-teal-100">
                    <Lock className="w-3 h-3" />
                    <span>Secure</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-teal-700 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-white font-medium">{onlineUsers.size}</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden text-white p-1 hover:bg-teal-700 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex bg-teal-700 rounded-lg p-1">
              <button
                onClick={switchToGroupChat}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md transition ${
                  chatMode === 'group' 
                    ? 'bg-white text-teal-600 font-semibold' 
                    : 'text-white hover:bg-teal-600'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm">Group</span>
              </button>
              <button
                onClick={() => setChatMode('private')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md transition ${
                  chatMode === 'private' 
                    ? 'bg-white text-teal-600 font-semibold' 
                    : 'text-white hover:bg-teal-600'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span className="text-sm">Private</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-white">
            {onlineUsers.size === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">No users online</p>
              </div>
            ) : (
              Array.from(onlineUsers.keys()).map((user) => (
                <div 
                  key={user} 
                  onClick={() => chatMode === 'private' && startPrivateChat(user)}
                  className={`p-4 border-b border-gray-100 transition ${
                    chatMode === 'private' 
                      ? 'hover:bg-teal-50 cursor-pointer' 
                      : 'hover:bg-gray-50'
                  } ${selectedPrivateUser === user ? 'bg-teal-100' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {getAvatar(user)}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium">{user}</div>
                      <div className="text-sm text-green-500 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                        Online
                      </div>
                    </div>
                    {chatMode === 'private' && (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col" style={{
          backgroundColor: '#efeae2',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'%3E%3Cg fill='%23d9dbd5' fill-opacity='0.28'%3E%3Cpath d='M71 118c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm68 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z'/%3E%3C/g%3E%3C/svg%3E")`
        }}>
          <div className="p-3 sm:p-4 border-b border-gray-300 bg-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden text-gray-600 hover:text-gray-900 p-1"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                  chatMode === 'private' ? 'bg-purple-500' : 'bg-gray-400'
                }`}>
                  {chatMode === 'private' && selectedPrivateUser ? getAvatar(selectedPrivateUser) : <Users className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-gray-900 font-semibold flex items-center space-x-2 text-sm sm:text-base">
                    <span>{chatMode === 'private' && selectedPrivateUser ? selectedPrivateUser : 'Group Chat'}</span>
                    {chatMode === 'private' && <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {chatMode === 'private' && selectedPrivateUser 
                      ? 'End-to-end secure' 
                      : onlineUsers.size > 0 
                        ? `${onlineUsers.size} online` 
                        : 'Waiting...'}
                  </p>
                </div>
              </div>
              <button 
                onClick={scrollToBottom}
                className="text-gray-600 hover:text-gray-900 transition p-2"
                title="Scroll to bottom"
              >
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 relative"
          >
            {showLoadMore && (
              <div className="text-center mb-4">
                <button 
                  onClick={loadOlderMessages}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm transition transform hover:scale-105"
                >
                  Load Previous Messages
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center px-4">
                  {chatMode === 'private' && !selectedPrivateUser ? (
                    <>
                      <Lock className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 opacity-20" />
                      <h3 className="text-lg sm:text-xl font-semibold mb-2">Select a User</h3>
                      <p className="text-sm">Click on any online user to start a private chat</p>
                      <p className="text-xs mt-2 text-gray-500">Your private messages are secure and isolated</p>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 opacity-20" />
                      <h3 className="text-lg sm:text-xl font-semibold mb-2">Start Chatting</h3>
                      <p className="text-sm">Share messages, files, and more</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                if (msg.type === 'system') {
                  return (
                    <div key={index} className="flex justify-center my-4">
                      <div className="bg-yellow-100 text-yellow-800 text-xs px-3 sm:px-4 py-2 rounded-lg shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                const isSent = msg.sender_id === userId;
                const avatar = getAvatar(msg.sender_id);
                const time = formatTime(msg.timestamp);

                return (
                  <div key={index} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex ${isSent ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-[85%] sm:max-w-md md:max-w-lg`}>
                      {!isSent && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0 shadow-md mr-2">
                          {avatar}
                        </div>
                      )}
                      <div>
                        {!isSent && chatMode === 'group' && (
                          <div className="text-xs text-left mb-1 px-2 text-gray-600 font-medium">
                            {msg.sender_id}
                          </div>
                        )}
                        <div className={`px-3 py-2 rounded-lg shadow-md ${
                          isSent 
                            ? 'bg-teal-500 text-white rounded-br-none' 
                            : 'bg-white text-gray-900 rounded-bl-none'
                        }`}>
                          {renderMessageContent(msg)}
                          <div className="flex items-center justify-end mt-1 space-x-1">
                            <span className={`text-xs ${isSent ? 'text-teal-100' : 'text-gray-500'}`}>{time}</span>
                            {chatMode === 'private' && (
                              <Lock className={`w-3 h-3 ${isSent ? 'text-teal-100' : 'text-gray-500'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {!isAtBottom && (
            <div className="absolute bottom-20 sm:bottom-24 right-4 sm:right-8 z-10">
              <button 
                onClick={scrollToBottom}
                className="bg-teal-500 hover:bg-teal-600 text-white rounded-full p-2 sm:p-3 shadow-lg transition transform hover:scale-110"
              >
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          )}

          <div className="p-3 sm:p-4 border-t border-gray-300 bg-gray-100">
            <div className="flex items-end space-x-2 mb-2">
              <div className="flex space-x-1 sm:space-x-2">
                <button 
                  onClick={() => {
                    setShowAttachMenu(!showAttachMenu);
                    setShowEmojiPicker(false);
                  }}
                  className="text-gray-600 hover:text-teal-600 transition p-1.5 sm:p-2"
                  disabled={chatMode === 'private' && !selectedPrivateUser}
                >
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button 
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowAttachMenu(false);
                  }}
                  className="text-gray-600 hover:text-teal-600 transition p-1.5 sm:p-2"
                  disabled={chatMode === 'private' && !selectedPrivateUser}
                >
                  <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={messageInput}
                  onChange={handleTextareaChange}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    chatMode === 'private' && !selectedPrivateUser 
                      ? 'Select a user to chat...' 
                      : 'Type a message...'
                  }
                  disabled={chatMode === 'private' && !selectedPrivateUser}
                  rows="1"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white rounded-full text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none transition border border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style={{ maxHeight: '150px' }}
                />
              </div>
              
              <button 
                onClick={sendMessage}
                disabled={chatMode === 'private' && !selectedPrivateUser}
                className="bg-teal-500 text-white p-2 sm:p-3 rounded-full hover:bg-teal-600 transition shadow-lg transform hover:scale-105 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {showAttachMenu && (
              <div className="grid grid-cols-5 gap-2 mb-2 bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                <input 
                  type="file" 
                  ref={el => fileInputRefs.current.image = el}
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e.target.files[0], 'image')}
                />
                <input 
                  type="file" 
                  ref={el => fileInputRefs.current.video = el}
                  accept="video/*" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e.target.files[0], 'video')}
                />
                <input 
                  type="file" 
                  ref={el => fileInputRefs.current.audio = el}
                  accept="audio/*" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e.target.files[0], 'audio')}
                />
                <input 
                  type="file" 
                  ref={el => fileInputRefs.current.document = el}
                  accept=".pdf,.doc,.docx,.txt" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e.target.files[0], 'document')}
                />
                
                <button 
                  onClick={() => fileInputRefs.current.image?.click()}
                  className="flex flex-col items-center p-2 sm:p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                >
                  <Image className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mb-1" />
                  <span className="text-xs text-gray-700">Image</span>
                </button>
                
                <button 
                  onClick={() => fileInputRefs.current.video?.click()}
                  className="flex flex-col items-center p-2 sm:p-3 bg-red-50 rounded-lg hover:bg-red-100 transition"
                >
                  <Video className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mb-1" />
                  <span className="text-xs text-gray-700">Video</span>
                </button>
                
                <button 
                  onClick={() => fileInputRefs.current.audio?.click()}
                  className="flex flex-col items-center p-2 sm:p-3 bg-green-50 rounded-lg hover:bg-green-100 transition"
                >
                  <Music className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mb-1" />
                  <span className="text-xs text-gray-700">Audio</span>
                </button>
                
                <button 
                  onClick={() => fileInputRefs.current.document?.click()}
                  className="flex flex-col items-center p-2 sm:p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mb-1" />
                  <span className="text-xs text-gray-700">Document</span>
                </button>
                
                <button 
                  onClick={shareLocation}
                  className="flex flex-col items-center p-2 sm:p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
                >
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 mb-1" />
                  <span className="text-xs text-gray-700">Location</span>
                </button>
              </div>
            )}

            {showEmojiPicker && (
              <div className="p-3 sm:p-4 bg-white rounded-lg shadow-lg max-h-40 sm:max-h-48 overflow-y-auto border border-gray-200">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 sm:gap-2">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setMessageInput(prev => prev + emoji);
                        textareaRef.current?.focus();
                      }}
                      className="text-xl sm:text-2xl p-1 sm:p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidChatApp;
