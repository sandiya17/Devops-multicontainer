// src/App.jsx - COMPLETE FEATURE-RICH FRONTEND CODE

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import io from 'socket.io-client';

// --- CONFIGURATION ---
const BACKEND_URL = 'http://localhost:8080'; 
const ADMIN_SECRET = 'SuperSecureAdminKey123'; 
const EMERGENCY_NUMBER = '9894231964'; // Updated requested number

// Initialize Socket.IO client
const socket = io(BACKEND_URL, { 
    transports: ['websocket', 'polling'] 
}); 

// --- Helper Components for UI ---

// Icon Component (using Font Awesome CDN from index.html)
const Icon = ({ name, className = '', style = {} }) => {
    const iconMap = {
        Home: 'fa-house', Shield: 'fa-shield-halved', Link: 'fa-link', BookOpen: 'fa-book-open', 
        Users: 'fa-users-line', LogOut: 'fa-right-from-bracket', List: 'fa-list-ul', 
        ChevronRight: 'fa-chevron-right', ChevronLeft: 'fa-chevron-left', Send: 'fa-paper-plane', 
        AlertTriangle: 'fa-triangle-exclamation', CheckCircle: 'fa-circle-check', Clock: 'fa-clock', 
        MessageSquare: 'fa-comment', Loader2: 'fa-spinner fa-spin', Phone: 'fa-phone', 
        Upload: 'fa-cloud-arrow-up', X: 'fa-xmark', BarChart3: 'fa-chart-simple', Mail: 'fa-envelope', 
        User: 'fa-user', Microphone: 'fa-microphone', Play: 'fa-play', Pause: 'fa-pause', 
        UserTie: 'fa-user-tie', Warning: 'fa-warning', Eye: 'fa-eye', Edit: 'fa-pen-to-square',
        Trash: 'fa-trash', Search: 'fa-magnifying-glass', Filter: 'fa-filter', Download: 'fa-download'
    };
    const iconClass = iconMap[name] || 'fa-question';
    
    return <i className={`fa-solid ${iconClass} ${className}`} style={style}></i>;
};

// Card Component for consistent styling
const Card = ({ children, className = '', hover = false, ...props }) => (
    <div 
        className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-200 ${
            hover ? 'hover:shadow-xl hover:border-indigo-200 transform hover:scale-[1.005]' : ''
        } ${className}`}
        {...props}
    >
        {children}
    </div>
);

// Button Component with styles and animations
const Button = ({ children, variant = 'primary', size = 'medium', loading = false, disabled = false, icon, iconPosition = 'left', className = '', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
    const variantClasses = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-lg',
        secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 shadow-md',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-lg',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-lg',
        warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 shadow-lg',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500'
    };
    const sizeClasses = { small: 'px-3 py-2 text-sm', medium: 'px-4 py-3 text-base', large: 'px-6 py-4 text-lg' };
    const iconSize = { small: 'w-4 h-4', medium: 'w-5 h-5', large: 'w-6 h-6' };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Icon name="Loader2" className={`${iconSize[size]} animate-spin mr-2`} />}
            {!loading && icon && iconPosition === 'left' && <Icon name={icon} className={`${iconSize[size]} mr-2`} />}
            {children}
            {!loading && icon && iconPosition === 'right' && <Icon name={icon} className={`${iconSize[size]} ml-2`} />}
        </button>
    );
};


const App = () => {
    const [view, setView] = useState('home'); 
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);

    // State for User Tracking
    const [trackingAlias, setTrackingAlias] = useState('');
    const [trackedCase, setTrackedCase] = useState(null);
    
    // State for Admin Chat/Dashboard
    const [currentCase, setCurrentCase] = useState(null);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // --- Voice Recording State ---
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);


    const showAlert = (message, type = 'success') => {
        setAlertMessage({ message, type });
        setTimeout(() => setAlertMessage(null), 5000);
    };

    // --- SOCKET.IO & REAL-TIME LOGIC ---
    useEffect(() => {
        socket.on('connect', () => console.log('Socket Connected'));
        socket.on('disconnect', () => console.log('Socket Disconnected'));

        socket.on('newReport', (newReport) => {
            if (isAdminLoggedIn) {
                setReports(prev => [newReport, ...prev]);
                showAlert(`🚨 NEW REPORT: ${newReport.alias}`, 'warning');
            }
        });

        socket.on('reportUpdated', (updatedReport) => {
             if (isAdminLoggedIn) {
                setReports(prev => prev.map(r => r._id === updatedReport._id ? updatedReport : r));
                if (currentCase?._id === updatedReport._id) setCurrentCase(updatedReport);
            }
            if (trackedCase?.alias === updatedReport.alias) {
                setTrackedCase(updatedReport);
                showAlert(`Case ${updatedReport.alias} status updated to ${updatedReport.status}.`, 'info');
            }
        });

        socket.on('emergencyAlert', ({ alias, message }) => {
            if (isAdminLoggedIn) {
                showAlert(`🆘 USER EMERGENCY from ${alias}: ${message}`, 'error');
            }
        });

        socket.on('newMessage', (updatedMessages) => {
            const lastMessage = updatedMessages[updatedMessages.length - 1];

            if (currentCase && lastMessage) setCurrentCase(prev => ({ ...prev, messages: updatedMessages }));
            if (trackedCase && lastMessage) setTrackedCase(prev => ({ ...prev, messages: updatedMessages }));
            
            if (lastMessage?.isEmergency && lastMessage.sender === 'User' && isAdminLoggedIn && currentCase?._id !== trackedCase?._id) { 
                 showAlert(`🆘 EMERGENCY CHAT MESSAGE from ${currentCase?.alias || trackedCase?.alias}`, 'error');
            } else if (lastMessage?.sender === 'Admin' && trackedCase) { 
                 showAlert('💬 New message from the Counselor.', 'info');
            }
        });

        return () => {
            socket.off('connect'); socket.off('disconnect'); socket.off('newReport'); 
            socket.off('reportUpdated'); socket.off('emergencyAlert'); socket.off('newMessage');
        };
    }, [isAdminLoggedIn, currentCase, trackedCase]);

    useEffect(() => {
        if (isAdminLoggedIn) {
            socket.emit('joinAdmin'); 
            fetchReports();
        }
    }, [isAdminLoggedIn]);

    // --- Voice Recording Logic ---
    const startRecording = async () => {
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            return showAlert("MediaRecorder not supported by this browser.", "error");
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (event) => {
                setAudioChunks(prev => [...prev, event.data]);
            };
            recorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioURL(url);
                setAudioChunks([]);
                stream.getTracks().forEach(track => track.stop()); // Stop microphone access
            };

            setMediaRecorder(recorder);
            setIsRecording(true);
            setAudioURL(null); // Clear previous recording
            setAudioBlob(null);
            recorder.start();
        } catch (err) {
            showAlert("Microphone access denied or failed.", "error");
            console.error("Recording error:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };
    
    // --- API CALLS ---
    const fetchReports = useCallback(async () => {
         setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/reports`, {
                headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
            });
            if (response.status === 200) {
                const data = await response.json();
                setReports(data);
            } else {
                showAlert('Failed to fetch reports. Check admin key.', 'error');
            }
        } catch (error) {
            console.error('Fetch reports error:', error);
            showAlert('Network error fetching reports.', 'error');
        } finally {
            setLoading(false);
        }
    }, [isAdminLoggedIn]);

    const handleTrackCase = async (aliasToTrack) => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/reports/alias/${aliasToTrack}`);
            const data = await response.json();

            if (response.status === 200) {
                setTrackedCase(data);
                socket.emit('joinReportRoom', data.alias); 
                showAlert(`Case ${data.alias} loaded. Status: ${data.status}`, 'info');
            } else {
                showAlert(data.message || 'Invalid tracking ID or case not found.', 'error');
                setTrackedCase(null);
            }
        } catch (error) {
            showAlert('Network error during tracking.', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleReportSubmit = async (formData) => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();

            if (response.status === 201) {
                showAlert(`Submission successful! Your tracking ID: ${data.alias}`, 'success');
                setView('userTracking');
                setTrackingAlias(data.alias); 
                handleTrackCase(data.alias);
            } else {
                showAlert(data.message || 'Submission failed.', 'error');
            }
        } catch (error) {
            showAlert('Network error during submission.', 'error');
        } finally {
            setLoading(false);
            setAudioURL(null); // Clear recording state after submit
            setAudioBlob(null);
        }
    };

    const handlePostMessage = async (alias, sender, messageText, isEmergency = false) => {
         if (!messageText.trim() && !isEmergency) return;

        const url = sender === 'Admin' 
            ? `${BACKEND_URL}/api/reports/message/admin/${currentCase?._id}` 
            : `${BACKEND_URL}/api/reports/message/user/${alias}`;
        
        const headers = { 'Content-Type': 'application/json' };
        if (sender === 'Admin') {
            headers['x-admin-secret'] = ADMIN_SECRET;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ sender, messageText, isEmergency }),
            });

            if (response.status === 201) {
                if (sender === 'Admin') {
                    setCurrentCase(prev => ({ ...prev, messages: (prev.messages || []).concat([{ sender, messageText, isEmergency, timestamp: new Date() }]) }));
                } else if (isEmergency) {
                    showAlert('🆘 Emergency Alert Sent! Admins Notified.', 'error');
                }
            } else {
                showAlert('Failed to send message.', 'error');
            }
        } catch (error) {
            showAlert('Network error sending message.', 'error');
        }
    };

    const handleStatusUpdate = async (reportId, newStatus) => {
         setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/reports/${reportId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
                body: JSON.stringify({ status: newStatus }),
            });
            
            if (response.status === 200) {
                const updatedReport = await response.json();
                showAlert(`Status of ${updatedReport.alias} updated to ${newStatus}`, 'success');
            } else {
                showAlert('Failed to update status.', 'error');
            }
        } catch (error) {
            showAlert('Network error updating status.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignCase = async (reportId, phone, name) => {
         setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/reports/${reportId}/assign`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
                body: JSON.stringify({ assignedToPhone: phone, assignedToName: name }),
            });
            
            if (response.status === 200) {
                const updatedReport = await response.json();
                showAlert(`Case assigned to ${updatedReport.report.assignedToName}. SMS notification simulated in console.`, 'success');
            } else {
                showAlert('Failed to assign case. Check input.', 'error');
            }
        } catch (error) {
            showAlert('Network error during assignment.', 'error');
        } finally {
            setLoading(false);
        }
    };


    // --- UI COMPONENTS DEFINITIONS ---
    
    // Loading Spinner Component (Must be defined early)
    const LoadingSpinner = ({ size = 'medium', text = 'Loading...' }) => (
        <div className={`flex flex-col items-center justify-center p-8 ${size === 'large' ? 'py-16' : 'py-8'}`}>
            <Icon name="Loader2" className={`text-indigo-600 ${size === 'large' ? 'w-6 h-6' : 'w-5 h-5'} mb-3`} spin />
            <p className="text-gray-600 text-sm">{text}</p>
        </div>
    );
    
    // StatCard Component (Must be defined early)
    const StatCard = ({ title, value, icon, color }) => (
        <Card className={`p-5 flex items-center space-x-4 ${color} text-white transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
            <Icon name={icon} className='w-8 h-8' />
            <div>
                <p className="text-sm font-medium opacity-90">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
            </div>
        </Card>
    );

    const Alert = ({ alert }) => {
         if (!alert) return null;
        const iconName = alert.type === 'success' ? 'CheckCircle' : alert.type === 'error' ? 'AlertTriangle' : 'MessageSquare';
        let colorClass = 'bg-blue-500';
        if (alert.type === 'success') colorClass = 'bg-emerald-500';
        if (alert.type === 'error') colorClass = 'bg-rose-600';
        if (alert.type === 'warning') colorClass = 'bg-amber-500';

        return (
            <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl text-white ${colorClass} flex items-center transition-opacity duration-300`}>
                <Icon name={iconName} className="w-5 h-5 mr-2" />
                <span>{alert.message}</span>
            </div>
        );
    };
    
    const EmergencyModal = () => {
        if (!showEmergencyModal) return null;

        return (
             <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 animate-fadeIn">
                <Card className="max-w-lg w-full transform animate-scaleIn">
                    <div className="p-8 text-center">
                        <Icon name="AlertTriangle" className="w-16 h-16 text-rose-600 mx-auto mb-4 animate-pulse"/>
                        <h2 className="text-2xl font-bold mb-3 text-gray-900">URGENT: IMMEDIATE HELP REQUIRED</h2>
                        <p className="text-gray-700 mb-6">
                            If you or someone else is in immediate danger, contact emergency services first.
                        </p>
                        <div className="space-y-3">
                            <Button
                                variant="danger"
                                size="large"
                                icon="Phone"
                                className="w-full"
                                onClick={() => window.open(`tel:${EMERGENCY_NUMBER}`, '_self')}
                            >
                                Call Emergency: {EMERGENCY_NUMBER}
                            </Button>
                            <Button
                                variant="secondary"
                                size="medium"
                                className="w-full"
                                onClick={() => setShowEmergencyModal(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    const AboutView = () => (
        <Card className="p-8 w-full max-w-4xl" hover>
             <h2 className="text-3xl font-extrabold mb-6 text-gray-900 tracking-tight flex items-center">
                <Icon name="BookOpen" className="w-7 h-7 mr-3 text-indigo-600"/> About SpeakUp
            </h2>
            <div className="space-y-6 text-gray-700">
                <p>SpeakUp is a dedicated, anonymous reporting system designed to ensure safety and accountability within institutions (schools, NGOs, workplaces). Our core mission is to remove the fear of retaliation or social stigma associated with reporting incidents of harassment, bullying, or abuse.</p>
                
                <h3 className="text-xl font-bold text-gray-800 pt-4">How Anonymity Works:</h3>
                <p>When you submit a report, the system generates a unique **Alias (e.g., SPK-A1B2C3)**. This ID is your only identifier. All communication with counselors is done through two-way encrypted chat, ensuring your personal identity (name, email, device ID) is never revealed unless you explicitly choose to provide it in the optional identity disclosure section.</p>
                
                <h3 className="text-xl font-bold text-gray-800 pt-4">Key Features:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>**Real-time Alerts:** Admins are instantly notified of new reports and emergency alerts.</li>
                    <li>**Two-way Encrypted Chat:** Secure communication with counselors.</li>
                    <li>**Case Management:** Admins can track, update, and assign cases efficiently, triggering SMS simulations upon assignment.</li>
                </ul>
                <div className="mt-8 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Note: For all immediate threats, please use the EMERGENCY call button immediately.</p>
                </div>
            </div>
        </Card>
    );
    
    // 3. Anonymous Report Form (Updated for Voice/Text input)
    const ReportForm = ({ onSubmit }) => {
        const [step, setStep] = useState(1);
        const [inputType, setInputType] = useState('text'); // 'text' or 'voice'
        const [formData, setFormData] = useState({
            category: 'Harassment', description: '', incidentDate: new Date().toISOString().substring(0, 10), 
            location: '', files: null, reporterName: '', contactEmail: '', voiceTranscript: '' 
        });

        const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
        const handleFileChange = (e) => { setFormData({ ...formData, files: e.target.files }); };

        const handleSubmit = (e) => {
            e.preventDefault();
            let dataToSubmit = { ...formData };
            delete dataToSubmit.files; 
            if (inputType === 'voice') {
                dataToSubmit.voiceTranscript = dataToSubmit.description;
                dataToSubmit.description = "Voice report submitted (see transcript)."; 
            }
            onSubmit(dataToSubmit);
        };

        const categories = ['Harassment', 'Bullying', 'Abuse', 'Discrimination', 'Retaliation', 'Other'];

        const StepIndicator = ({ stepNumber, title, current, completed }) => (
             <div className={`flex items-center space-x-3 transition-all duration-300 ${current ? 'text-indigo-700 font-bold scale-105' : completed ? 'text-emerald-600' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all duration-300 ${current ? 'bg-indigo-700 border-indigo-700 text-white shadow-lg' : completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'}`}>
                    {completed ? <Icon name="CheckCircle" className="w-4 h-4" /> : stepNumber}
                </div>
                <span className="hidden sm:inline">{title}</span>
             </div>
        );

        // --- Step 1: Input Method and Details (Includes Text/Voice Input) ---
        const Step1 = () => (
             <div className="space-y-6 animate-fadeIn">
                <p className="text-lg text-gray-700 font-medium border-b pb-2">1. Select Input Method & Details</p>
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setInputType('text')} className={`p-4 rounded-lg shadow-md transition-all duration-200 transform ${inputType === 'text' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:scale-[1.02]'}`}><Icon name="List" className="w-6 h-6 mb-1 mx-auto"/> Text Entry</button>
                    <button type="button" onClick={() => {setInputType('voice'); setAudioURL(null);}} className={`p-4 rounded-lg shadow-md transition-all duration-200 transform ${inputType === 'voice' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:scale-[1.02]'}`}>
                        <Icon name="Microphone" className="w-6 h-6 mb-1 mx-auto"/> Voice Report
                    </button>
                </div>
                
                {inputType === 'text' && (
                    <div className="animate-fadeIn">
                         <label className="block text-sm font-medium text-gray-700">Incident Details (Text)</label>
                         <textarea name="description" rows="4" value={formData.description} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 p-3 border transition-all duration-200 hover:border-indigo-300" placeholder="Describe the incident in detail."></textarea>
                    </div>
                )}
                {inputType === 'voice' && (
                    <div className="border border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50 animate-fadeIn hover:border-indigo-300 transition-all duration-200">
                         <p className="text-sm font-medium text-gray-700 flex items-center justify-center">
                            <Icon name="Microphone" className="w-5 h-5 mr-2 text-indigo-500"/> Voice Report Recording
                        </p>
                        
                        {/* Recording/Playback Controls */}
                        {!audioURL ? (
                            <div className="flex space-x-2 justify-center">
                                <Button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    variant={isRecording ? 'danger' : 'primary'}
                                    size="small"
                                    icon={isRecording ? 'Pause' : 'Microphone'}
                                    className={isRecording ? 'animate-pulse' : ''}
                                >
                                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex space-x-2 justify-center items-center">
                                <p className="text-sm text-emerald-600 font-semibold">Recording Ready</p>
                                <a href={audioURL} download="speakup_recording.webm">
                                    <Button variant="success" size="small" icon="Download">Download/Review</Button>
                                </a>
                                <Button variant="secondary" size="small" icon="Trash" onClick={() => {setAudioURL(null); setFormData(prev => ({...prev, description: ''}));}}>Discard</Button>
                            </div>
                        )}
                        
                        <label className="block text-xs font-medium text-gray-700 mt-3">Voice Transcript (Required for submission):</label>
                        <textarea name="description" placeholder="Paste transcribed summary of the recording here..." rows="2" value={formData.description} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 p-2 text-sm" />
                    </div>
                )}
                <Button type="button" onClick={() => setStep(2)} icon="ChevronRight" iconPosition="right" className="w-full">
                    Next: Incident Classification
                </Button>
             </div>
        );

        // --- Step 2: Classification, Date, Location ---
        const Step2 = () => (
             <div className="space-y-6 animate-fadeIn">
                <p className="text-lg text-gray-700 font-medium border-b pb-2">2. Classification and Timeline</p>
                <div><label className="block text-sm font-medium text-gray-700">What best describes the incident?</label>
                    <select name="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 p-3 border transition-all duration-200 hover:border-indigo-300">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700">Date of Incident</label>
                    <input type="date" name="incidentDate" value={formData.incidentDate} onChange={handleChange} required max={new Date().toISOString().substring(0, 10)} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 p-3 border transition-all duration-200 hover:border-indigo-300"/>
                </div>
                <div><label className="block text-sm font-medium text-gray-700">Location (Optional Geo-tag placeholder)</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Office Floor 3, Online chat, etc." className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 p-3 border transition-all duration-200 hover:border-indigo-300"/>
                </div>
                <div className="flex space-x-4">
                    <Button type="button" onClick={() => setStep(1)} variant="secondary" className="flex-1">Back</Button>
                    <Button type="button" onClick={() => setStep(3)} icon="ChevronRight" iconPosition="right" className="flex-1">Next: Attachments</Button>
                </div>
             </div>
        );

        // --- Step 3 & 4 (Attachments and Identity) ---
        const Step3 = () => (
             <div className="space-y-6 animate-fadeIn">
                <p className="text-lg text-gray-700 font-medium border-b pb-2">3. Attach Evidence (Optional)</p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-all duration-200 hover:border-indigo-500 hover:bg-indigo-50/50 cursor-pointer">
                    <Icon name="Upload" className="w-6 h-6 mx-auto text-gray-500 mb-2"/>
                    <label htmlFor="file-upload" className="block text-sm font-medium text-indigo-700 cursor-pointer hover:text-indigo-900 transition-colors">Click here to upload files (Images, Documents, Voice)</label>
                    <input id="file-upload" type="file" name="files" multiple onChange={handleFileChange} className="sr-only" disabled /> 
                    <p className="text-xs text-gray-500 mt-1">**Maximum 5 files. (Feature simulated in MVP)**</p>
                    {formData.files && formData.files.length > 0 && (<p className="mt-2 text-sm text-emerald-600 font-medium animate-fadeIn">{formData.files.length} file(s) selected.</p>)}
                </div>

                <div className="flex space-x-4">
                    <Button type="button" onClick={() => setStep(2)} variant="secondary" className="flex-1">Back</Button>
                    <Button type="button" onClick={() => setStep(4)} icon="ChevronRight" iconPosition="right" className="flex-1">Next: Identity</Button>
                </div>
             </div>
        );
        
        const Step4 = () => (
             <div className="space-y-6 animate-fadeIn">
                <p className="text-lg font-bold text-rose-600 border-b pb-2">4. Optional Identity Disclosure</p>
                <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-sm text-rose-800 rounded-lg shadow-inner animate-pulse">
                    <p className="font-extrabold flex items-center mb-1"><Icon name="AlertTriangle" className="w-4 h-4 mr-2"/> IMPORTANT ANONYMITY WARNING</p>
                    <p>**Do NOT fill these fields if you wish to remain 100% anonymous.**</p>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 flex items-center"><Icon name="User" className="w-4 h-4 mr-1"/> Name (Optional)</label><input type="text" name="reporterName" value={formData.reporterName} onChange={handleChange} placeholder="First and last name" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 p-3 border transition-all duration-200 hover:border-indigo-300"/></div>
                <div><label className="block text-sm font-medium text-gray-700 flex items-center"><Icon name="Mail" className="w-4 h-4 mr-1"/> Email (Optional)</label><input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} placeholder="Contact email for direct follow-up" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 p-3 border transition-all duration-200 hover:border-indigo-300"/></div>

                <div className="flex space-x-4">
                    <Button type="button" onClick={() => setStep(3)} variant="secondary" className="flex-1">Back</Button>
                    <Button type="submit" loading={loading} icon="CheckCircle" variant="success" className="flex-1">Submit Report</Button>
                </div>
             </div>
        );


        const currentStepComponent = useMemo(() => {
            switch (step) {
                case 1: return <Step1 />; case 2: return <Step2 />; case 3: return <Step3 />; case 4: return <Step4 />;
                default: return <Step1 />;
            }
        }, [step, formData, inputType, isRecording, audioURL]);

        return (
             <Card className="p-8 w-full max-w-3xl" hover>
                <h2 className="text-3xl font-extrabold mb-6 text-gray-900 flex items-center tracking-tight">
                    <Icon name="Shield" className="w-7 h-7 mr-3 text-indigo-600"/> Confidential Incident Report
                </h2>
                <div className="flex justify-between items-center border-b pb-4 mb-8">
                    <StepIndicator stepNumber={1} title="Input" current={step === 1} completed={step > 1} />
                    <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${step > 1 ? 'bg-indigo-700' : 'bg-gray-300'} hidden sm:block`}></div>
                    <StepIndicator stepNumber={2} title="Classification" current={step === 2} completed={step > 2} />
                    <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${step > 2 ? 'bg-indigo-700' : 'bg-gray-300'} hidden sm:block`}></div>
                    <StepIndicator stepNumber={3} title="Attachments" current={step === 3} completed={step > 3} />
                    <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${step > 3 ? 'bg-indigo-700' : 'bg-gray-300'} hidden sm:block`}></div>
                    <StepIndicator stepNumber={4} title="Identity" current={step === 4} completed={step > 4} />
                </div>
                
                <form onSubmit={handleSubmit}>
                    {currentStepComponent}
                </form>
             </Card>
        );
    };

    // 4. Case Detail/Chat View and Admin Components
    const AssignCaseComponent = ({ report, onAssign }) => {
        const [phone, setPhone] = useState('');
        const [name, setName] = useState('');

        const handleSubmit = (e) => {
            e.preventDefault();
            if (!phone || !name) return showAlert("Name and Phone are required for assignment.", "error");
            onAssign(report._id, phone, name);
            setPhone('');
            setName('');
        };

        return (
            <Card className="p-4 bg-yellow-50 border-l-4 border-yellow-500 space-y-3 animate-fadeIn">
                <h4 className="font-bold text-yellow-800 flex items-center"><Icon name="UserTie" className='w-4 h-4 mr-2'/> Assign Case to Counselor:</h4>
                <p className='text-xs text-yellow-700'>Simulated SMS will be sent to the phone number upon assignment.</p>
                <form onSubmit={handleSubmit} className="space-y-3"> 
                    <input type="text" placeholder="Counselor Name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-2 border rounded-lg text-sm focus:border-yellow-500 focus:ring-yellow-500 transition-all duration-200"/>
                    <input type="text" placeholder="Counselor Phone (e.g., 9876543210)" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full p-2 border rounded-lg text-sm focus:border-yellow-500 focus:ring-yellow-500 transition-all duration-200"/>
                    <Button type="submit" loading={loading} variant="warning" size="small" className="w-full">
                        Assign & Simulate SMS
                    </Button>
                </form>
            </Card>
        );
    };
    
    const CaseDetailView = ({ caseData, isAdministrator }) => {
        const alias = caseData?.alias;
        const messages = caseData?.messages || [];
        const [input, setInput] = useState('');

        const chatWindowRef = useRef(null);

        useEffect(() => {
            if (chatWindowRef.current) {
                chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
            }
        }, [messages]);

        const handleSend = (e) => {
            e.preventDefault();
            const sender = isAdministrator ? 'Admin' : 'User';
            handlePostMessage(alias, sender, input);
            setInput('');
        };

        const getStatusColor = (status) => {
            switch (status) {
                case 'Open': return 'bg-rose-500 text-white';
                case 'In Progress': return 'bg-amber-500 text-white';
                case 'Resolved': return 'bg-emerald-500 text-white';
                default: return 'bg-slate-500 text-white';
            }
        };

        const MessageBubble = ({ message, isUser }) => (
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-[1.01] ${message.isEmergency ? 'bg-rose-700 !text-white border border-rose-300 shadow-2xl animate-pulse' : isUser ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-200 text-gray-800 rounded-tl-sm'}`}>
                    {message.isEmergency && (<p className='text-xs font-bold mb-1 flex items-center'><Icon name='AlertTriangle' className='w-3 h-3 mr-1'/> EMERGENCY ALERT</p>)}
                    <p className="text-sm">{message.messageText}</p>
                    <span className={`block text-xs mt-1 ${message.isEmergency ? '!text-rose-200' : isUser ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                </div>
            </div>
        );

        return (
            <Card className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <Icon name="MessageSquare" className="w-5 h-5 mr-2 text-indigo-600"/> Case Chat: <span className="text-indigo-600 ml-1">{alias}</span>
                    </h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${getStatusColor(caseData.status)}`}>{caseData.status}</span>
                </div>

                {/* Case Info / Admin Controls */}
                <div className="p-4 bg-slate-50 border-b border-gray-100 text-sm space-y-2">
                    <div className="flex justify-between flex-wrap">
                        <p><strong>Category:</strong> {caseData.category}</p>
                        <p><strong>Date Filed:</strong> {new Date(caseData.createdAt).toLocaleDateString()}</p>
                        {caseData.voiceTranscript && <p className='w-full pt-2 text-xs font-semibold text-indigo-800 animate-fadeIn'>🎤 Voice Transcript: {caseData.voiceTranscript.substring(0, 50)}...</p>}
                    </div>
                    {isAdministrator && (caseData.reporterName || caseData.contactEmail) && (
                        <div className="pt-2 border-t border-slate-200 mt-2 bg-indigo-50 p-2 rounded-lg animate-fadeIn">
                            <p className="font-medium text-gray-700 mb-1">Reporter Contact Info:</p>
                            {caseData.reporterName && <p className='text-xs'>Name: {caseData.reporterName}</p>}
                            {caseData.contactEmail && <p className='text-xs'>Email: {caseData.contactEmail}</p>}
                        </div>
                    )}
                    {isAdministrator && !caseData.assignedToName && (
                        <AssignCaseComponent report={caseData} onAssign={handleAssignCase} />
                    )}
                    {isAdministrator && caseData.assignedToName && (
                        <div className="pt-2 border-t border-slate-200 mt-2 bg-emerald-50 p-2 rounded-lg animate-fadeIn">
                            <p className="font-medium text-gray-700">Assigned To: {caseData.assignedToName} ({caseData.assignedToPhone})</p>
                        </div>
                    )}
                    {isAdministrator && (
                        <div className="pt-2 border-t border-slate-200 mt-2">
                            <p className="font-medium mb-1 text-gray-700">Update Status:</p>
                            <select value={caseData.status} onChange={(e) => handleStatusUpdate(caseData._id, e.target.value)} className="p-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200">
                                {['Open', 'In Progress', 'Resolved', 'Closed'].map(s => (<option key={s} value={s}>{s}</option>))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Chat Area */}
                <div ref={chatWindowRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    <div className="text-center text-xs text-slate-500 italic mb-4">--- Anonymous communication established ---</div>
                    {messages.map((msg, index) => (<MessageBubble key={index} message={msg} isUser={msg.sender === (isAdministrator ? 'Admin' : 'User')} />))}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white flex space-x-2">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={isAdministrator ? "Respond confidentially..." : "Reply to your counselor..."} className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"/>
                    <Button type="submit" disabled={!input.trim()} icon="Send" className="rounded-l-none">Send</Button>
                </form>
            </Card>
        );
    };

    const InitialDashboardView = ({ stats }) => (
         <Card className="h-full flex flex-col items-center justify-center p-8 text-center" hover>
            <Icon name="BarChart3" className="w-16 h-16 text-indigo-400 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to the Case Manager</h2>
            <p className="text-gray-500 mb-8">Select a report from the list on the left to view details, update its status, and engage in anonymous two-way chat.</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105">Open: {stats.open}</div>
                <div className="p-3 bg-amber-50 text-amber-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105">Progress: {stats.inProgress}</div>
            </div>
         </Card>
    );

    const AdminDashboard = () => {
         const filteredReports = useMemo(() => {
            let filtered = reports;
            if (searchTerm) { filtered = filtered.filter(report => report.alias.toLowerCase().includes(searchTerm.toLowerCase()) || report.category.toLowerCase().includes(searchTerm.toLowerCase()) || (report.reporterName && report.reporterName.toLowerCase().includes(searchTerm.toLowerCase()))); }
            if (statusFilter !== 'all') { filtered = filtered.filter(report => report.status === statusFilter); }
            const statusOrder = ['Open', 'In Progress', 'Resolved', 'Closed'];
            return filtered.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
        }, [reports, searchTerm, statusFilter]);

        const stats = {
            open: reports.filter(r => r.status === 'Open').length,
            inProgress: reports.filter(r => r.status === 'In Progress').length,
            resolved: reports.filter(r => r.status === 'Resolved').length,
            total: reports.length,
        };

        const getStatusPill = (status) => {
            switch (status) { case 'Open': return 'bg-rose-500 text-white'; case 'In Progress': return 'bg-amber-500 text-white'; case 'Resolved': return 'bg-emerald-500 text-white'; default: return 'bg-slate-500 text-white'; }
        };

        const ReportListItem = ({ report }) => (
             <li onClick={() => { setCurrentCase(report); socket.emit('joinReportRoom', report.alias); }} className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 transform hover:scale-[1.005] ${currentCase?._id === report._id ? 'bg-indigo-50 border-indigo-300 shadow-inner scale-[1.02]' : 'hover:bg-gray-50'}`}>
                <div className="flex justify-between items-center">
                    <div className="font-bold text-lg text-indigo-700">{report.alias}</div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${getStatusPill(report.status)}`}>{report.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{report.category} filed {new Date(report.createdAt).toLocaleDateString()}</p>
             </li>
        );

        return (
             <div className="flex flex-col h-[calc(100vh-100px)] w-full max-w-screen-xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center tracking-tight">
                        <Icon name="Users" className="w-7 h-7 mr-3 text-indigo-600"/> Case Management Dashboard
                    </h1>
                    <Button onClick={() => {setIsAdminLoggedIn(false); setView('home');}} variant="ghost" icon="LogOut">Logout</Button>
                </div>
                <Card className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input type="text" placeholder="Search cases by ID, category, or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"/>
                        </div>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200">
                            <option value="all">All Status</option><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option>
                        </select>
                    </div>
                </Card>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Reports" value={stats.total} icon="List" color="bg-gray-700"/>
                    <StatCard title="Open Cases" value={stats.open} icon="AlertTriangle" color="bg-rose-600"/>
                    <StatCard title="In Progress" value={stats.inProgress} icon="Clock" color="bg-amber-500"/>
                    <StatCard title="Resolved Cases" value={stats.resolved} icon="CheckCircle" color="bg-emerald-600"/>
                </div>
                <div className="flex flex-1 space-x-6 overflow-hidden">
                    <Card className="w-full lg:w-1/3 min-w-80 flex flex-col overflow-hidden">
                        <div className="p-4 bg-indigo-700 text-white font-bold text-lg sticky top-0 z-10">Reports ({filteredReports.length})</div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (<LoadingSpinner text="Loading reports..." />) : filteredReports.length === 0 ? (<div className="p-8 text-center text-gray-500"><Icon name="Search" className="w-8 h-8 mx-auto mb-2 text-gray-400" /><p>No cases found</p></div>) : (<ul className="divide-y divide-gray-100">{filteredReports.map((report) => (<ReportListItem key={report._id} report={report} />))}</ul>)}
                        </div>
                    </Card>
                    <div className="w-full lg:w-2/3 h-full">
                        {currentCase ? (<CaseDetailView caseData={currentCase} isAdministrator={true} />) : (<InitialDashboardView stats={stats} />)}
                    </div>
                </div>
             </div>
        );
    };

    const UserTrackingView = () => {
        const [aliasInput, setAliasInput] = useState(trackingAlias);

        const handleCheckStatus = (e) => {
            e.preventDefault();
            handleTrackCase(aliasInput.toUpperCase());
        };

        if (trackedCase) {
             return (
                <div className="flex flex-col h-full items-center w-full space-y-4">
                    <div className="w-full max-w-2xl">
                        <Button onClick={() => setTrackedCase(null)} variant="ghost" icon="ChevronLeft">Back to Status Check</Button>
                    </div>
                    <div className="w-full max-w-2xl h-[calc(100vh-12rem)]">
                        <CaseDetailView caseData={trackedCase} isAdministrator={false} />
                        <Button 
                            onClick={() => handlePostMessage(trackedCase.alias, 'User', "IMMEDIATE DANGER! PLEASE RESPOND NOW!", true)}
                            variant="danger"
                            size="large"
                            icon="AlertTriangle"
                            className="w-full mt-4 animate-pulse"
                        >
                            SEND EMERGENCY ALERT TO ADMINS
                        </Button>
                    </div>
                </div>
            );
        }

        return (
             <Card className="p-8 w-full max-w-sm" hover>
                <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
                    <Icon name="Link" className="w-6 h-6 mr-2 text-indigo-600"/> Track Your Report
                </h2>
                <p className="text-sm text-gray-600 mb-6">Enter your system-generated anonymous tracking ID (e.g., SPK-1A2B3C) to view its status and communicate with your counselor.</p>
                <form onSubmit={handleCheckStatus} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tracking ID</label>
                        <input type="text" value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} required placeholder="SPK-XXXXXX" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border transition-all duration-200 hover:border-indigo-300"/>
                    </div>
                    <Button type="submit" loading={loading} icon="ChevronRight" iconPosition="right" className="w-full">
                        Check Status & Open Chat
                    </Button>
                </form>
             </Card>
        );
    };

    const ResourcesView = () => (
         <Card className="p-8 w-full max-w-5xl flex flex-col md:flex-row gap-8" hover>
            <div className="md:w-1/3">
                 <div className="w-full h-48 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mb-4 text-indigo-600 font-semibold shadow-inner">Support Resources</div>
                <h2 className="text-3xl font-extrabold mb-4 text-gray-900 tracking-tight">Support & Help</h2>
                <p className="text-gray-600">You are not alone. These external, confidential resources are available 24/7 for immediate support and guidance.</p>
            </div>

            <div className="md:w-2/3 space-y-6">
                <ResourceCard title="Crisis Text Line (741741)" description="Connect with a crisis counselor for free, confidential support 24/7." icon="MessageSquare" actionText="Text HOME to 741741" color="bg-emerald-600"/>
                <ResourceCard title="National Crisis Hotline (988)" description="24/7 free and confidential support for people in distress." icon="Phone" actionText="Call 988" color="bg-rose-600"/>
                <ResourceCard title="Workplace EAP / School Counseling" description="Institutional Employee Assistance Programs (EAP) or campus counseling services." icon="Users" actionText="Check Local Directory" color="bg-indigo-600"/>
            </div>
         </Card>
    );

    const ResourceCard = ({ title, description, icon, actionText, color }) => (
         <Card className="flex items-center p-5 transition-all duration-200 hover:scale-[1.02] cursor-pointer">
            <Icon name={icon} className={`w-8 h-8 mr-4 p-1 rounded-full ${color} text-white`} />
            <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
            </div>
            <Button variant="primary" size="small" className={color.replace('bg-', 'bg-')}>
                {actionText}
            </Button>
         </Card>
    );
    
    const AdminLogin = () => {
         const [keyInput, setKeyInput] = useState('');

        const handleSubmit = (e) => {
            e.preventDefault();
            if (keyInput === ADMIN_SECRET) {
                setIsAdminLoggedIn(true);
                setView('adminDashboard');
                showAlert('Admin login successful!', 'success');
            } else {
                showAlert('Invalid Admin Key.', 'error');
            }
        };

        return (
             <Card className="p-8 w-full max-w-sm" hover>
                <h2 className="text-2xl font-bold mb-4 text-gray-900 tracking-tight">Staff Login</h2>
                <p className="text-sm text-gray-600 mb-6">Enter the secure key to access the case management system.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Secret Access Key</label>
                        <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 p-3 border transition-all duration-200 hover:border-indigo-300"/>
                    </div>
                    <Button type="submit" className="w-full">Log In</Button>
                </form>
             </Card>
        );
    };

    const HomeView = () => (
         <div className="space-y-10 w-full max-w-5xl">
            <Card className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8" hover>
                <div className="md:w-2/3 space-y-4">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tighter">
                        Secure, Anonymous Reporting for a <span className="text-indigo-600">Safer Environment</span>
                    </h1>
                    <p className="text-xl text-gray-600">Empowering victims and bystanders to **SpeakUp** without fear of retaliation. All communications are confidential and tracked via a unique alias.</p>
                </div>
                <div className="md:w-1/3 w-full h-48 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center text-indigo-600 italic font-semibold border-2 border-dashed border-indigo-300 shadow-inner">Safe Space Illustration</div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MenuCard title="Submit Report" description="Start your confidential submission process now." icon="Shield" onClick={() => setView('report')} color="bg-indigo-600"/>
                <MenuCard title="Track Report Status" description="Use your ID to check updates and start an anonymous chat." icon="Link" onClick={() => setView('userTracking')} color="bg-sky-600"/>
                <MenuCard title="Support Resources" description="Find external mental health and crisis support." icon="BookOpen" onClick={() => setView('resources')} color="bg-emerald-600"/>
            </div>
            <div className="text-center pt-8">
                <Button onClick={() => setView('adminLogin')} variant="secondary" icon="Users">Counselor/Staff Access Portal</Button>
            </div>
         </div>
    );
    
    const MenuCard = ({ title, description, icon, onClick, color }) => (
         <button
            onClick={onClick}
            className={`p-6 text-white rounded-xl shadow-2xl transition-all duration-300 flex flex-col items-start space-y-3 transform hover:scale-105 active:scale-95 w-full text-left ${color} hover:shadow-3xl`}
            style={{ background: `linear-gradient(135deg, ${color}D0, ${color}FF)` }} 
        >
            <Icon name={icon} className='w-8 h-8' />
            <span className="text-xl font-bold">{title}</span>
            <span className="text-sm opacity-90">{description}</span>
         </button>
    );

    const MainHeader = () => {
         const NavButton = ({ label, currentView, target, onClick }) => (
            <Button onClick={() => onClick(target)} variant={currentView === target ? 'primary' : 'ghost'} size="small" className={`transition-all duration-200 ${currentView === target ? 'shadow-md' : 'hover:bg-indigo-50'}`}>
                {label}
            </Button>
        );
        return (
            <header className="bg-white shadow-lg p-4 flex justify-between items-center sticky top-0 z-20 border-b border-gray-100">
                <div onClick={() => setView('home')} className="text-2xl font-extrabold text-indigo-700 cursor-pointer flex items-center tracking-tight transition-all duration-200 hover:text-indigo-900 hover:scale-105">
                    <Icon name="Home" className="w-6 h-6 mr-2"/> SPEAKUP
                </div>
                
                <nav className="space-x-2 flex items-center">
                    <NavButton label="About" currentView={view} target="about" onClick={setView} />
                    <NavButton label="Resources" currentView={view} target="resources" onClick={setView} />
                    {isAdminLoggedIn ? <NavButton label="Dashboard" currentView={view} target="adminDashboard" onClick={setView} /> : <NavButton label="Login" currentView={view} target="adminLogin" onClick={setView} />}
                    
                    <Button onClick={() => setShowEmergencyModal(true)} variant="danger" size="small" icon="AlertTriangle" className="animate-pulse">
                        EMERGENCY
                    </Button>
                </nav>
            </header>
        );
    };


    // --- MAIN RENDER LOGIC (Final, Correct Structure) ---
    const renderContent = () => {
        // 1. Check if admin is logged in but navigated away from dashboard
        if (isAdminLoggedIn && view !== 'adminDashboard') {
            setView('adminDashboard');
            return null; // Return null while state updates
        }

        // 2. Main view router using switch statement
        switch (view) {
            case 'report': 
                return <ReportForm onSubmit={handleReportSubmit} />;
            case 'adminLogin': 
                return <AdminLogin />;
            case 'adminDashboard': 
                return <AdminDashboard />;
            case 'userTracking': 
                return <UserTrackingView />;
            case 'resources': 
                return <ResourcesView />;
            case 'about': 
                return <AboutView />;
            case 'home':
            default: 
                return <HomeView />;
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 font-sans flex flex-col">
            <Alert alert={alertMessage} onClose={() => setAlertMessage(null)} />
            <EmergencyModal />

            <MainHeader />
            
            <main className="flex-1 flex justify-center items-start p-8">
                {renderContent()}
            </main>

            <footer className="bg-gray-800 text-white p-4 text-center text-xs">
                <p>© 2024 SpeakUp | Confidentiality and Privacy Guaranteed.</p>
            </footer>

            {/* CSS Animation Definitions (for full style visibility) */}
            <style jsx>{`
                 @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                 @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { transform: scale(1); } }
                 .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                 .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
                 .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
             `}</style>
        </div>
    );
};

export default App;