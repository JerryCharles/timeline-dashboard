'use client';

import Image from "next/image";
import { useEffect, useState, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from 'wagmi';
import { useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { use } from 'react';
import dynamic from 'next/dynamic';
import MarkdownIt from 'markdown-it';
import EventForm from './EventForm';

// Make the entire component client-side only
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false
});

import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const API_URL = 'https://tl-api.3ja.com';

// Initialize markdown parser
const mdParser = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

function renderHTML(text) {
  return mdParser.render(text);
}

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Editor configuration
const EDITOR_CONFIG = {
  preview: 'live',
  height: 300,
  visibleDragbar: false,
  hideToolbar: false,
  enableScroll: true,
  textareaProps: {
    placeholder: 'Enter markdown content...'
  }
};

// Move formatDate to a client component
const FormattedDate = memo(({ timestamp }) => {
  const [formattedDate, setFormattedDate] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!timestamp || !mounted) return;
    try {
      const date = new Date(timestamp * 1000);
      // Use a consistent date format that won't change with locale
      const formatted = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC'
      }).format(date);
      setFormattedDate(formatted);
    } catch (error) {
      setFormattedDate('');
    }
  }, [timestamp, mounted]);

  // Return empty span during SSR or before mount
  if (!mounted) {
    return <span></span>;
  }

  return <span>{formattedDate}</span>;
});

// Memoized EventTable component
const EventTable = memo(function EventTable({ events, onEdit, onDelete }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg shadow">
      <table className="w-full text-sm text-left">
        <thead className="text-xs bg-gray-100 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 w-[12%]">Time</th>
            <th scope="col" className="px-6 py-3 w-[55%]">Content</th>
            <th scope="col" className="px-6 py-3 w-[18%]">Labels</th>
            <th scope="col" className="px-6 py-3 w-[7%]">Source</th>
            <th scope="col" className="px-6 py-3 w-[8%]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.eventID} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              <td className="px-6 py-4 whitespace-nowrap">
                <FormattedDate timestamp={event.time} />
              </td>
              <td className="px-6 py-4">
                <div>
                  <div 
                    className="text-gray-900 dark:text-white line-clamp-2 markdown-content"
                    dangerouslySetInnerHTML={{ __html: mdParser.render(event.content) }}
                  />
                  <br/>
                  <div 
                    className="text-gray-500 text-sm line-clamp-2 markdown-content"
                    dangerouslySetInnerHTML={{ __html: mdParser.render(event.contentCN) }}
                  />
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                  {event.labels && event.labels.map((label, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <span className="px-2 py-1 text-xs rounded-t-lg bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-b border-blue-200 w-full text-center">
                        {label}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-b-lg bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-200 w-full text-center">
                        {event.labelsCN[index]}
                      </span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4">
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    <span>Source</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button 
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full dark:text-red-400 dark:hover:bg-red-900/20"
                    title="Delete"
                    onClick={() => onDelete(event)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                  <button 
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full dark:text-blue-400 dark:hover:bg-blue-900/20"
                    title="Edit"
                    onClick={() => onEdit(event)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default function EventsPage({ params }) {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const resolvedParams = use(params);
  const topicId = resolvedParams.topicId;
  const { signMessageAsync } = useSignMessage();
  
  // Initialize all state hooks at the top
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topic, setTopic] = useState(null);
  const [events, setEvents] = useState([]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    contentCN: '',
    url: '',
    labels: [],
    labelsCN: [],
    newLabel: '',
    newLabelCN: '',
    time: '',
    type: 0
  });

  // Define all callbacks before effects
  const debouncedFormUpdate = useCallback(
    debounce((newFormData) => {
      setFormData(newFormData);
    }, 300),
    []
  );

  const hasEventChanged = useCallback((currentFormData) => {
    if (!editingEvent) return true;
    
    return (
      currentFormData.content !== editingEvent.content ||
      currentFormData.contentCN !== editingEvent.contentCN ||
      currentFormData.url !== editingEvent.url ||
      currentFormData.time !== new Date(editingEvent.time * 1000).toISOString().slice(0, 16) ||
      JSON.stringify(currentFormData.labels) !== JSON.stringify(editingEvent.labels) ||
      JSON.stringify(currentFormData.labelsCN) !== JSON.stringify(editingEvent.labelsCN)
    );
  }, [editingEvent]);

  const handleDeleteClick = useCallback((event) => {
    setEventToDelete(event);
    setShowDeleteAlert(true);
  }, []);

  const handleEditClick = useCallback((event) => {
    setEditingEvent(event);
    const eventDate = new Date(event.time * 1000);
    setFormData({
      content: event.content,
      contentCN: event.contentCN,
      url: event.url || '',
      labels: event.labels || [],
      labelsCN: event.labelsCN || [],
      newLabel: '',
      newLabelCN: '',
      time: eventDate.toISOString().slice(0, 16),
      type: event.type || 0
    });
    setIsEditEventOpen(true);
  }, []);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  }, []);

  const signMessage = useCallback(async (message) => {
    if (!isConnected) {
      showNotification('Please connect your wallet first', 'error');
      return null;
    }
    
    try {
      console.log('Signing message:', message);
      const signature = await signMessageAsync({ message });
      console.log('Signature received:', signature);
      return signature;
    } catch (error) {
      console.log('Error code:', error.code);
      if(error.code === 4001){
        showNotification('Message signing was rejected by user', 'error');
      } else {
        showNotification('Failed to sign message: ' + error.message, 'error');
      }
      return null;
    }
  }, [isConnected, signMessageAsync, showNotification]);

  // Define all effects
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  useEffect(() => {
    if (isConnected) {
      fetchEvents();
    }
  }, [isConnected, topicId]);

  // Define all other functions after hooks
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodName: "getEventInfos",
          paramInfo: {
            topicID: parseInt(topicId),
            page: 0,
            pageSize: 200
          }
        })
      });
      const data = await response.json();
      if (data.code === 0) {
        setTopic(data.data.topic);
        setEvents(data.data.events);
      } else {
        setError(data.msg);
      }
    } catch (err) {
      setError('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  // Return early if not mounted
  if (!mounted) {
    return null;
  }

  const validateForm = () => {
    const errors = {};
    if (!formData.content.trim()) errors.content = 'Content (English) is required';
    if (!formData.contentCN.trim()) errors.contentCN = 'Content (Chinese) is required';
    if (formData.url && !isValidUrl(formData.url)) errors.url = 'Invalid URL format';
    if (!formData.time) errors.time = 'Time is required';
    if (formData.newLabel || formData.newLabelCN) {
      errors.labels = 'Please add or clear the label fields before submitting';
    }
    return errors;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (submittedFormData) => {
    if (editingEvent && !hasEventChanged(submittedFormData)) {
      showNotification('No changes detected', 'error');
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      if (editingEvent) {
        const changedFields = {};
        if (submittedFormData.content !== editingEvent.content) changedFields.content = submittedFormData.content;
        if (submittedFormData.contentCN !== editingEvent.contentCN) changedFields.contentCN = submittedFormData.contentCN;
        changedFields.url = submittedFormData.url || '';
        if (JSON.stringify(submittedFormData.labels) !== JSON.stringify(editingEvent.labels)) {
          changedFields.labels = submittedFormData.labels;
          changedFields.labelsCN = submittedFormData.labelsCN;
        }

        // Get current timestamp
        const message = (Date.now() + 8000).toString();
        
        // Get signature
        const signature = await signMessage(message);
        if (!signature) {
          setIsSubmitting(false);
          return;
        }

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            methodName: "updateEventInfo",
            timestamp: message,
            signature: signature,
            paramInfo: {
              eventID: editingEvent.eventID,
              updateInfo: changedFields
            }
          }),
        });
        const data = await response.json();
        if (data.code === 0) {
          showNotification('Event updated successfully');
          await fetchEvents();
          setIsEditEventOpen(false);
          setEditingEvent(null);
          setFormData({
            content: '',
            contentCN: '',
            url: '',
            labels: [],
            labelsCN: [],
            newLabel: '',
            newLabelCN: '',
            time: '',
            type: 0
          });
        } else {
          showNotification(data.msg || 'Failed to update event', 'error');
          setError(data.msg);
        }
      } else {
        // Get current timestamp
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        // Create message to sign
        const message = (Date.now() + 8000).toString();

        // Get signature
        const signature = await signMessage(message);
        if (!signature) {
          setIsSubmitting(false);
          return;
        }

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            methodName: "addEventInfo",
            timestamp: message,
            signature: signature,
            paramInfo: {
              content: submittedFormData.content,
              contentCN: submittedFormData.contentCN,
              url: submittedFormData.url || '',
              labels: submittedFormData.labels,
              labelsCN: submittedFormData.labelsCN,
              topicID: parseInt(topicId),
              time: Math.floor(new Date(submittedFormData.time).getTime() / 1000),
              type: submittedFormData.type
            }
          }),
        });
        const data = await response.json();
        if (data.code === 0) {
          showNotification('Event created successfully');
          await fetchEvents();
          setIsAddEventOpen(false);
          setFormData({
            content: '',
            contentCN: '',
            url: '',
            labels: [],
            labelsCN: [],
            newLabel: '',
            newLabelCN: '',
            time: '',
            type: 0
          });
        } else {
          showNotification(data.msg || 'Failed to create event', 'error');
          setError(data.msg);
        }
      }
    } catch (err) {
      showNotification('Failed to save event', 'error');
      setError('Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLabel = () => {
    if (formData.newLabel && formData.newLabelCN) {
      setFormData({
        ...formData,
        labels: [...formData.labels, formData.newLabel],
        labelsCN: [...formData.labelsCN, formData.newLabelCN],
        newLabel: '',
        newLabelCN: ''
      });
    }
  };

  const handleRemoveLabel = (index) => {
    setFormData({
      ...formData,
      labels: formData.labels.filter((_, i) => i !== index),
      labelsCN: formData.labelsCN.filter((_, i) => i !== index)
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Get current timestamp
      const message = (Date.now() + 8000).toString();
      
      // Get signature
      const signature = await signMessage(message);
      if (!signature) {
        setIsDeleting(false);
        return;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodName: "markToDeleteEvent",
          timestamp: message,
          signature: signature,
          paramInfo: {
            eventID: eventToDelete.eventID
          }
        }),
      });
      const data = await response.json();
      if (data.code === 0) {
        showNotification('Event deleted successfully');
        await fetchEvents();
      } else {
        showNotification(data.msg || 'Failed to delete event', 'error');
        setError(data.msg);
      }
    } catch (err) {
      showNotification('Failed to delete event', 'error');
      setError('Failed to delete event');
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
      setEventToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-8">
          <div className="text-lg">Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-8">
          <div className="text-red-500">Error: {error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <style jsx global>{`
        .markdown-content p { margin: 0; }
        .markdown-content h1, 
        .markdown-content h2, 
        .markdown-content h3, 
        .markdown-content h4, 
        .markdown-content h5, 
        .markdown-content h6 { 
          margin: 0; 
          font-size: inherit; 
        }
        .markdown-content ul, 
        .markdown-content ol { 
          margin: 0; 
          padding-left: 1.5em; 
        }
        .markdown-content img { 
          max-width: 100%; 
          height: auto; 
        }
        .markdown-content code { 
          background-color: rgba(0,0,0,0.05); 
          padding: 0.2em 0.4em; 
          border-radius: 3px; 
        }
        .markdown-content pre code { 
          display: block; 
          padding: 1em; 
          overflow-x: auto; 
        }
        .markdown-content blockquote { 
          margin: 0; 
          padding-left: 1em; 
          border-left: 3px solid #ddd; 
        }
        .markdown-content table { 
          border-collapse: collapse; 
        }
        .markdown-content th, 
        .markdown-content td { 
          border: 1px solid #ddd; 
          padding: 0.5em; 
        }
        .dark .markdown-content code {
          background-color: rgba(255,255,255,0.1);
        }
        .dark .markdown-content blockquote {
          border-left-color: #4a5568;
        }
        .dark .markdown-content th,
        .dark .markdown-content td {
          border-color: #4a5568;
        }
      `}</style>
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      <main className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
        {/* Topic Header */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{topic?.title}</h1>
            <p className="text-gray-500 dark:text-gray-400">{topic?.titleCN}</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectButton />
            <button 
              onClick={() => setIsAddEventOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>

        <EventTable 
          events={events} 
          onEdit={handleEditClick} 
          onDelete={handleDeleteClick} 
        />
      </main>

      {/* Add/Edit Event Modal */}
      {(isAddEventOpen || isEditEventOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6 text-center text-gray-900 dark:text-white">
                {isEditEventOpen ? 'Edit Event' : 'Add New Event'}
              </h2>
              <EventForm
                initialData={formData}
                isEditMode={isEditEventOpen}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setIsAddEventOpen(false);
                  setIsEditEventOpen(false);
                  setEditingEvent(null);
                  setFormData({
                    content: '',
                    contentCN: '',
                    url: '',
                    labels: [],
                    labelsCN: [],
                    newLabel: '',
                    newLabelCN: '',
                    time: '',
                    type: 0
                  });
                }}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert */}
      {showDeleteAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Are you sure you want to delete this event?
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
              <p className="font-medium text-gray-900 dark:text-white line-clamp-2">{eventToDelete?.content}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 line-clamp-2">{eventToDelete?.contentCN}</p>
            </div>
            <p className="text-red-500 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  setShowDeleteAlert(false);
                  setEventToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 