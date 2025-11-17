// src/pages/admin/Policies/TermsEditor.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SectionHeader from '../components/SectionHeader';
import { FaFileContract, FaEdit, FaSave, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import { fetchTermsAndConditions, saveTermsAndConditions } from '../lib/dataFetchers';
import useAuth from '../../../hooks/useAuth';

const TermsEditor = ({ showToast }) => {
  const { user } = useAuth();
  const [termsContent, setTermsContent] = useState('');
  const [editingTerms, setEditingTerms] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      setLoading(true);
      const content = await fetchTermsAndConditions();
      setTermsContent(content);
    } catch (error) {
      console.error('Error loading terms:', error);
      showToast('Failed to load terms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTerms = async () => {
    if (!termsContent.trim()) {
      showToast('Terms content cannot be empty', 'error');
      return;
    }

    setSavingTerms(true);
    try {
      await saveTermsAndConditions(termsContent, user?.uid || 'admin');
      showToast('Terms & Conditions updated successfully');
      setEditingTerms(false);
    } catch (error) {
      console.error('Error saving terms:', error);
      showToast('Failed to save terms', 'error');
    } finally {
      setSavingTerms(false);
    }
  };

  return (
    <motion.div
      key="terms"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Terms & Conditions</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Create and manage HTML-formatted terms that appear on host registration.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <SectionHeader icon={FaFileContract} title="Terms & Conditions Editor" />
          {!editingTerms ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setEditingTerms(true)}
              className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
            >
              <FaEdit className="text-sm" />
              <span className="hidden sm:inline">Edit Terms</span>
              <span className="sm:hidden">Edit</span>
            </motion.button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveTerms}
                disabled={savingTerms}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingTerms ? (
                  <>
                    <FaSpinner className="animate-spin text-sm" />
                    <span className="hidden sm:inline">Saving...</span>
                    <span className="sm:hidden">Saving</span>
                  </>
                ) : (
                  <>
                    <FaSave className="text-sm" />
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditingTerms(false);
                  loadTerms();
                }}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-sm"
              >
                Cancel
              </motion.button>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex gap-3">
            <FaInfoCircle className="text-blue-600 text-lg flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">HTML Editing Enabled</p>
              <p>You can use HTML tags like <code className="bg-blue-100 px-1 rounded">&lt;h1&gt;</code>, <code className="bg-blue-100 px-1 rounded">&lt;p&gt;</code>, <code className="bg-blue-100 px-1 rounded">&lt;ul&gt;</code>, <code className="bg-blue-100 px-1 rounded">&lt;strong&gt;</code>, etc.</p>
              <p className="mt-1">The formatted version will be displayed to hosts during registration.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading terms...</p>
            </div>
          </div>
        ) : editingTerms ? (
          /* HTML Editor Mode */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                HTML Content (Edit Mode)
              </label>
              <textarea
                value={termsContent}
                onChange={(e) => setTermsContent(e.target.value)}
                className="w-full p-3 sm:p-4 border-2 border-emerald-600 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 font-mono text-xs sm:text-sm min-h-[300px] sm:min-h-[500px]"
                placeholder="<h1>Zennest Terms and Conditions</h1>&#10;<p>Welcome to Zennest...</p>&#10;<ul>&#10;  <li>Point 1</li>&#10;  <li>Point 2</li>&#10;</ul>"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Raw HTML is saved exactly as typed. No sanitization applied.
              </p>
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Formatted Preview (How hosts will see it)
              </label>
              <div className="border-2 border-gray-200 rounded-lg p-3 sm:p-6 bg-gray-50 min-h-[300px] sm:min-h-[500px] overflow-auto">
                {termsContent ? (
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: termsContent }}
                  />
                ) : (
                  <p className="text-gray-400 italic">No terms content available. Click "Edit Terms" to add content.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TermsEditor;

