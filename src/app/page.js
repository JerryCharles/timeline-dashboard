'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import MDEditor from '@uiw/react-md-editor';
import MarkdownIt from 'markdown-it';

const API_URL = 'https://timeline-833534357674.us-central1.run.app';
// Initialize markdown parser
const md = new MarkdownIt();

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isEditTopicOpen, setIsEditTopicOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    titleCN: '',
    summary: '',
    summaryCN: '',
    image: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.titleCN.trim()) errors.titleCN = 'Chinese title is required';
    if (!formData.summary.trim()) errors.summary = 'Summary is required';
    if (!formData.summaryCN.trim()) errors.summaryCN = 'Chinese summary is required';
    if (formData.image && !isValidUrl(formData.image)) errors.image = 'Invalid image URL';
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

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodName: "getTopicInfos",
          paramInfo: {
            page: currentPage,
            pageSize: 20
          }
        })
      });
      const data = await response.json();
      if (data.code === 0) {
        setTopics(data.data.topics);
        setTotalPages(Math.ceil(data.data.total / 20));
      } else {
        setError(data.msg);
      }
    } catch (err) {
      setError('Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [currentPage]);

  const handleEditClick = (topic) => {
    setEditingTopic(topic);
    setFormData({
      title: topic.title,
      titleCN: topic.titleCN,
      summary: topic.summary,
      summaryCN: topic.summaryCN,
      image: topic.image
    });
    setIsEditTopicOpen(true);
  };

  const handleDeleteClick = (topic) => {
    setTopicToDelete(topic);
    setShowDeleteAlert(true);
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
          methodName: "markToDeleteTopic",
          timestamp: message,
          signature: signature,
          paramInfo: {
            topicID: topicToDelete.topicID
          }
        }),
      });
      const data = await response.json();
      if (data.code === 0) {
        showNotification('Topic deleted successfully');
        await fetchTopics();
      } else {
        showNotification(data.msg || 'Failed to delete topic', 'error');
        setError(data.msg);
      }
    } catch (err) {
      showNotification('Failed to delete topic', 'error');
      setError('Failed to delete topic');
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
      setTopicToDelete(null);
    }
  };

  const hasTopicChanged = () => {
    if (!editingTopic) return true;
    
    return (
      formData.title !== editingTopic.title ||
      formData.titleCN !== editingTopic.titleCN ||
      formData.summary !== editingTopic.summary ||
      formData.summaryCN !== editingTopic.summaryCN ||
      formData.image !== editingTopic.image
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingTopic && !hasTopicChanged()) {
      showNotification('No changes detected', 'error');
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      if (editingTopic) {
        const changedFields = {};
        if (formData.title !== editingTopic.title) changedFields.title = formData.title;
        if (formData.titleCN !== editingTopic.titleCN) changedFields.titleCN = formData.titleCN;
        if (formData.summary !== editingTopic.summary) changedFields.summary = formData.summary;
        if (formData.summaryCN !== editingTopic.summaryCN) changedFields.summaryCN = formData.summaryCN;
        if (formData.image !== editingTopic.image) changedFields.image = formData.image;

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
            methodName: "updateTopicInfo",
            timestamp: message,
            signature: signature,
            paramInfo: {
              topicID: editingTopic.topicID,
              updateInfo: changedFields
            }
          }),
        });
        const data = await response.json();
        if (data.code === 0) {
          showNotification('Topic updated successfully');
          await fetchTopics();
          setIsEditTopicOpen(false);
          setEditingTopic(null);
          setFormData({
            title: '',
            titleCN: '',
            summary: '',
            summaryCN: '',
            image: ''
          });
        } else {
          showNotification(data.msg || 'Failed to update topic', 'error');
          setError(data.msg);
        }
      } else {
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
            methodName: "addTopicInfo",
            timestamp: message,
            signature: signature,
            paramInfo: {
              title: formData.title,
              titleCN: formData.titleCN,
              summary: formData.summary,
              summaryCN: formData.summaryCN,
              image: formData.image,
              relatedTopics: []
            }
          }),
        });
        const data = await response.json();
        if (data.code === 0) {
          showNotification('Topic created successfully');
          setCurrentPage(0);
          await fetchTopics();
          setIsAddTopicOpen(false);
          setFormData({
            title: '',
            titleCN: '',
            summary: '',
            summaryCN: '',
            image: ''
          });
        } else {
          showNotification(data.msg || 'Failed to create topic', 'error');
          setError(data.msg);
        }
      }
    } catch (err) {
      showNotification('Failed to save topic', 'error');
      setError('Failed to save topic');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRowClick = (topic, e) => {
    if (
      e.target.closest('button') ||
      e.target.closest('[data-image-preview]')
    ) {
      return;
    }
    if (!isConnected) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }
    router.push(`/events/${topic.topicID}`);
  };

  const signMessage = async (message) => {
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
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      <main className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Topics Management</h1>
          <div className="flex items-center gap-4">
            <ConnectButton />
            {isConnected && (
              <button 
                onClick={() => setIsAddTopicOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <div className="w-full overflow-x-auto rounded-lg shadow">
          <table className="w-full text-sm text-left">
            <thead className="text-xs bg-gray-100 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3">Image</th>
                <th scope="col" className="px-6 py-3">Title</th>
                <th scope="col" className="px-6 py-3">Summary</th>
                <th scope="col" className="px-6 py-3">Time</th>
                <th scope="col" className="px-6 py-3">ID</th>
                {isConnected && <th scope="col" className="px-6 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr 
                  key={topic.topicID} 
                  className={`bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${isConnected ? 'cursor-pointer' : ''}`}
                  onClick={(e) => handleRowClick(topic, e)}
                >
                  <td className="px-6 py-4">
                    {topic.image && (
                      <div 
                        data-image-preview
                        className="relative w-16 h-16 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(topic.image);
                        }}
                      >
                        <Image
                          src={topic.image}
                          alt="Topic image"
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <div>
                      <div className="text-gray-900 dark:text-white">{topic.title}</div>
                      <br/>
                      <div className="text-gray-500 text-sm">{topic.titleCN}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <div>
                      <div 
                        className="text-gray-900 dark:text-white line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: md.render(topic.summary || '') }}
                      ></div>
                      <br/>
                      <div 
                        className="text-gray-500 text-sm line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: md.render(topic.summaryCN || '') }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{new Date(topic.time).toLocaleString()}</td>
                  <td className="px-6 py-4">{topic.topicID}</td>
                  {isConnected && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full dark:text-red-400 dark:hover:bg-red-900/20"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(topic);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                        <button 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full dark:text-blue-400 dark:hover:bg-blue-900/20"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(topic);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:bg-gray-800 dark:border-gray-700 rounded-b-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing page <span className="font-medium">{currentPage + 1}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(0)}
                  disabled={currentPage === 0}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                >
                  <span className="sr-only">First</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" />
                  </svg>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" />
                  </svg>
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = index;
                  } else if (currentPage < 2) {
                    pageNumber = index;
                  } else if (currentPage > totalPages - 3) {
                    pageNumber = totalPages - 5 + index;
                  } else {
                    pageNumber = currentPage - 2 + index;
                  }
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      disabled={currentPage === pageNumber}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        currentPage === pageNumber
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNumber + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages - 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                >
                  <span className="sr-only">Last</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" />
                  </svg>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </main>

      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={selectedImage}
              alt="Full size image"
              fill
              className="object-contain"
            />
            <button 
              className="absolute top-4 right-4 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {(isAddTopicOpen || isEditTopicOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6 text-center text-gray-900 dark:text-white">
                {isEditTopicOpen ? 'Edit Topic' : 'Add New Topic'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title (English)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({...formData, title: e.target.value});
                      setFormErrors({...formErrors, title: ''});
                    }}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 ${
                      formErrors.title ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title (Chinese)</label>
                  <input
                    type="text"
                    value={formData.titleCN}
                    onChange={(e) => {
                      setFormData({...formData, titleCN: e.target.value});
                      setFormErrors({...formErrors, titleCN: ''});
                    }}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 ${
                      formErrors.titleCN ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {formErrors.titleCN && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.titleCN}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Summary (English)</label>
                  <div data-color-mode="light" className="dark:data-color-mode-dark">
                    <MDEditor
                      value={formData.summary}
                      onChange={(value) => {
                        setFormData({...formData, summary: value || ''});
                        setFormErrors({...formErrors, summary: ''});
                      }}
                      height={200}
                      className={`${formErrors.summary ? 'border border-red-500 rounded-lg' : ''}`}
                    />
                  </div>
                  {formErrors.summary && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.summary}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Summary (Chinese)</label>
                  <div data-color-mode="light" className="dark:data-color-mode-dark">
                    <MDEditor
                      value={formData.summaryCN}
                      onChange={(value) => {
                        setFormData({...formData, summaryCN: value || ''});
                        setFormErrors({...formErrors, summaryCN: ''});
                      }}
                      height={200}
                      className={`${formErrors.summaryCN ? 'border border-red-500 rounded-lg' : ''}`}
                    />
                  </div>
                  {formErrors.summaryCN && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.summaryCN}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Image URL</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => {
                      setFormData({...formData, image: e.target.value});
                      setFormErrors({...formErrors, image: ''});
                    }}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 ${
                      formErrors.image ? 'border-red-500' : ''
                    }`}
                  />
                  {formErrors.image && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.image}</p>
                  )}
                </div>
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddTopicOpen(false);
                      setIsEditTopicOpen(false);
                      setEditingTopic(null);
                      setFormData({
                        title: '',
                        titleCN: '',
                        summary: '',
                        summaryCN: '',
                        image: ''
                      });
                      setFormErrors({});
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{isEditTopicOpen ? 'Saving...' : 'Creating...'}</span>
                      </>
                    ) : (
                      <span>{isEditTopicOpen ? 'Save Changes' : 'Create Topic'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Are you sure you want to delete this topic?
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
              <p className="font-medium text-gray-900 dark:text-white">{topicToDelete?.title}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{topicToDelete?.titleCN}</p>
            </div>
            <p className="text-red-500 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  setShowDeleteAlert(false);
                  setTopicToDelete(null);
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
