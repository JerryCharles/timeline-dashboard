'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import dynamic from 'next/dynamic';
import MarkdownIt from 'markdown-it';

// Make the editor client-side only
const MdEditor = dynamic(() => import('react-markdown-editor-lite'), {
  ssr: false
});

import 'react-markdown-editor-lite/lib/index.css';

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

// Editor configuration
const EDITOR_CONFIG = {
  view: { 
    menu: true, 
    md: true, 
    html: true 
  },
  canView: {
    menu: true,
    md: true,
    html: true,
    fullScreen: true,
    hideMenu: true,
  },
  table: {
    maxRow: 5,
    maxCol: 6,
  },
  syncScrollMode: ['leftFollowRight', 'rightFollowLeft'],
  imageAccept: '.jpg,.jpeg,.png,.gif',
  htmlClass: 'markdown-body',
  markdownClass: 'markdown-body',
  language: 'en-US'
};

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

// Add FormattedDate component
const FormattedDate = memo(({ timestamp }) => {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    try {
      const date = new Date(timestamp * 1000).toLocaleString();
      setFormattedDate(date);
    } catch (error) {
      setFormattedDate('');
    }
  }, [timestamp]);

  return <span>{formattedDate}</span>;
});

export default function EventForm({ 
  initialData, 
  isEditMode, 
  onSubmit, 
  onCancel, 
  isSubmitting 
}) {
  // Initialize form data with empty values and update in useEffect
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

  // Update form data when initialData changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const [formErrors, setFormErrors] = useState({});

  // Debounced update only for non-editor fields
  const debouncedFormUpdate = useCallback(
    debounce((field, value) => {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }, 300),
    []
  );

  // Handle immediate updates for markdown editors
  const handleEditorChange = (field, text) => {
    setFormData(prev => ({
      ...prev,
      [field]: text
    }));
    setFormErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  // Handle debounced updates for other fields
  const handleFieldChange = (field, value) => {
    debouncedFormUpdate(field, value);
    setFormErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

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

  const handleAddLabel = () => {
    if (formData.newLabel && formData.newLabelCN) {
      const newFormData = {
        ...formData,
        labels: [...formData.labels, formData.newLabel],
        labelsCN: [...formData.labelsCN, formData.newLabelCN],
        newLabel: '',
        newLabelCN: ''
      };
      setFormData(newFormData);
    }
  };

  const handleRemoveLabel = (index) => {
    const newFormData = {
      ...formData,
      labels: formData.labels.filter((_, i) => i !== index),
      labelsCN: formData.labelsCN.filter((_, i) => i !== index)
    };
    setFormData(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Event Type <span className="text-red-500">*</span></label>
        {isEditMode ? (
          <div className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-300">
            {formData.type === 0 ? 'Event' : 'Note'}
          </div>
        ) : (
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="eventType"
                value={0}
                checked={formData.type === 0}
                onChange={(e) => handleFieldChange('type', Number(e.target.value))}
                className="mr-2"
              />
              Event
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="eventType"
                value={1}
                checked={formData.type === 1}
                onChange={(e) => handleFieldChange('type', Number(e.target.value))}
                className="mr-2"
              />
              Note
            </label>
          </div>
        )}
      </div>

      {/* Time field */}
      <div>
        <label className="block text-sm font-medium mb-1">Time <span className="text-red-500">*</span></label>
        {isEditMode ? (
          <div className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-300">
            <FormattedDate timestamp={Math.floor(new Date(formData.time).getTime() / 1000)} />
          </div>
        ) : (
          <input
            type="datetime-local"
            value={formData.time}
            onChange={(e) => handleFieldChange('time', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 ${
              formErrors.time ? 'border-red-500' : ''
            }`}
            required
          />
        )}
        {formErrors.time && !isEditMode && (
          <p className="mt-1 text-sm text-red-500">{formErrors.time}</p>
        )}
      </div>

      {/* Content fields */}
      <div>
        <label className="block text-sm font-medium mb-1">Content (English)</label>
        <div className="markdown-editor-container dark:bg-gray-800">
          <MdEditor
            value={formData.content}
            onChange={({ text }) => handleEditorChange('content', text)}
            renderHTML={renderHTML}
            className={`${formErrors.content ? 'border-red-500' : ''}`}
            style={{ height: '300px' }}
            {...EDITOR_CONFIG}
          />
        </div>
        {formErrors.content && (
          <p className="mt-1 text-sm text-red-500">{formErrors.content}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Content (Chinese)</label>
        <div className="markdown-editor-container dark:bg-gray-800">
          <MdEditor
            value={formData.contentCN}
            onChange={({ text }) => handleEditorChange('contentCN', text)}
            renderHTML={renderHTML}
            className={`${formErrors.contentCN ? 'border-red-500' : ''}`}
            style={{ height: '300px' }}
            {...EDITOR_CONFIG}
          />
        </div>
        {formErrors.contentCN && (
          <p className="mt-1 text-sm text-red-500">{formErrors.contentCN}</p>
        )}
      </div>

      {/* URL field */}
      <div>
        <label className="block text-sm font-medium mb-1">Source URL</label>
        <input
          type="url"
          value={formData.url}
          onChange={(e) => handleFieldChange('url', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 ${
            formErrors.url ? 'border-red-500' : ''
          }`}
        />
        {formErrors.url && (
          <p className="mt-1 text-sm text-red-500">{formErrors.url}</p>
        )}
      </div>

      {/* Labels */}
      <div>
        <label className="block text-sm font-medium mb-1">Labels</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.labels.map((label, index) => (
            <div key={index} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-1">
              <div className="flex flex-col">
                <span className="text-blue-800 dark:text-blue-300">{label}</span>
                <span className="text-blue-600 dark:text-blue-200 text-xs">{formData.labelsCN[index]}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveLabel(index)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.newLabel}
            onChange={(e) => handleFieldChange('newLabel', e.target.value)}
            placeholder="Label (English)"
            className={`flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 ${
              formErrors.labels ? 'border-red-500' : ''
            }`}
          />
          <input
            type="text"
            value={formData.newLabelCN}
            onChange={(e) => handleFieldChange('newLabelCN', e.target.value)}
            placeholder="Label (Chinese)"
            className={`flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 ${
              formErrors.labels ? 'border-red-500' : ''
            }`}
          />
          <button
            type="button"
            onClick={handleAddLabel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Add
          </button>
        </div>
        {formErrors.labels && (
          <p className="mt-1 text-sm text-red-500">{formErrors.labels}</p>
        )}
      </div>

      {/* Form buttons */}
      <div className="flex justify-center gap-2 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
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
              <span>{isEditMode ? 'Saving...' : 'Creating...'}</span>
            </>
          ) : (
            <span>{isEditMode ? 'Save Changes' : 'Create Event'}</span>
          )}
        </button>
      </div>
    </form>
  );
} 