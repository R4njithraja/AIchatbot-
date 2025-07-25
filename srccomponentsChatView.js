// src/components/SettingsView.js
import React, { useState } from 'react';
import { doc, setDoc, addDoc, collection, updateDoc, deleteDoc } from 'firebase/firestore';
import { Palette, Text, User, BarChart, Upload, Edit, Trash2 } from '../utils/icons'; // Import icons

function SettingsView({
    userId,
    highContrastMode,
    fontSize,
    handleUpdateSettings,
    promptTemplates,
    theme,
    db,
    __app_id
}) {
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateContent, setNewTemplateContent] = useState('');
    const [editingTemplate, setEditingTemplate] = useState(null); // template object being edited

    const handleSavePromptTemplate = async () => {
        if (!userId || !newTemplateName.trim() || !newTemplateContent.trim()) return;

        try {
            if (editingTemplate) {
                await updateDoc(doc(db, `artifacts/${__app_id}/users/${userId}/promptTemplates`, editingTemplate.id), {
                    name: newTemplateName.trim(),
                    template: newTemplateContent.trim(),
                    updatedAt: Date.now(),
                });
                setEditingTemplate(null);
            } else {
                await addDoc(collection(db, `artifacts/${__app_id}/users/${userId}/promptTemplates`), {
                    name: newTemplateName.trim(),
                    template: newTemplateContent.trim(),
                    createdAt: Date.now(),
                });
            }
            setNewTemplateName('');
            setNewTemplateContent('');
        } catch (error) {
            console.error("Error saving prompt template:", error);
        }
    };

    const handleDeletePromptTemplate = async (templateId) => {
        if (!userId || !templateId) return;
        if (window.confirm("Are you sure you want to delete this template?")) { // Using window.confirm for simplicity
            try {
                await deleteDoc(doc(db, `artifacts/${__app_id}/users/${userId}/promptTemplates`, templateId));
            } catch (error) {
                console.error("Error deleting prompt template:", error);
            }
        }
    };

    const handleEditPromptTemplate = (template) => {
        setEditingTemplate(template);
        setNewTemplateName(template.name);
        setNewTemplateContent(template.template);
    };

    return (
        <div className={`flex-grow p-8 overflow-y-auto ${theme.cardBg} ${theme.cardBorder} border m-4 rounded-lg`}>
            <h2 className="text-2xl font-bold mb-6">Settings</h2>

            {/* UI/UX & Accessibility */}
            <section className="mb-8 p-6 rounded-lg border border-gray-300 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Palette size={20} /> UI/UX & Accessibility</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* High Contrast Mode */}
                    <div className="flex items-center justify-between">
                        <label htmlFor="high-contrast" className="font-medium">High Contrast Mode</label>
                        <input
                            type="checkbox"
                            id="high-contrast"
                            checked={highContrastMode}
                            onChange={(e) => handleUpdateSettings('highContrastMode', e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                    </div>
                    {/* Font Size Scaling */}
                    <div className="flex items-center justify-between">
                        <label htmlFor="font-size" className="font-medium">Font Size</label>
                        <select
                            id="font-size"
                            value={fontSize}
                            onChange={(e) => handleUpdateSettings('fontSize', e.target.value)}
                            className={`p-2 rounded-md ${theme.inputBg} ${theme.text} ${theme.inputBorder} border focus:ring-blue-500 focus:border-blue-500`}
                        >
                            <option value="sm">Small</option>
                            <option value="base">Medium</option>
                            <option value="lg">Large</option>
                            <option value="xl">Extra Large</option>
                        </select>
                    </div>
                    {/* Placeholder for PWA */}
                    <div className="flex items-center justify-between col-span-full">
                        <span className="font-medium">Progressive Web App (PWA)</span>
                        <button className={`px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} disabled>Install PWA (Conceptual)</button>
                    </div>
                </div>
            </section>

            {/* Custom Prompt Engine */}
            <section className="mb-8 p-6 rounded-lg border border-gray-300 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Text size={20} /> Custom Prompt Templates</h3>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Template Name"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className={`w-full p-2 mb-2 rounded-md ${theme.inputBg} ${theme.text} ${theme.inputBorder} border focus:ring-blue-500 focus:border-blue-500`}
                    />
                    <textarea
                        placeholder="Template Content (e.g., 'Write a professional email about...')"
                        value={newTemplateContent}
                        onChange={(e) => setNewTemplateContent(e.target.value)}
                        rows="4"
                        className={`w-full p-2 mb-2 rounded-md ${theme.inputBg} ${theme.text} ${theme.inputBorder} border focus:ring-blue-500 focus:border-blue-500 resize-y`}
                    ></textarea>
                    <button
                        onClick={handleSavePromptTemplate}
                        className={`px-4 py-2 rounded-lg ${theme.primaryBtnBg} text-white hover:scale-105 transition duration-200`}
                    >
                        {editingTemplate ? 'Update Template' : 'Add New Template'}
                    </button>
                    {editingTemplate && (
                        <button
                            onClick={() => { setEditingTemplate(null); setNewTemplateName(''); setNewTemplateContent(''); }}
                            className={`ml-2 px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`}
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
                <h4 className="font-semibold mb-2">Your Templates:</h4>
                {promptTemplates.length === 0 ? (
                    <p className="text-gray-500">No custom templates saved yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {promptTemplates.map(template => (
                            <li key={template.id} className="flex items-center justify-between p-3 rounded-md bg-gray-50 border border-gray-200">
                                <div>
                                    <p className="font-medium">{template.name}</p>
                                    <p className="text-sm text-gray-600 truncate">{template.template}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditPromptTemplate(template)}
                                        className="p-2 rounded-full hover:bg-blue-500/20 text-blue-500 transition duration-200"
                                        title="Edit Template"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePromptTemplate(template.id)}
                                        className="p-2 rounded-full hover:bg-red-500/20 text-red-500 transition duration-200"
                                        title="Delete Template"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* AI & Backend Enhancements (Placeholders) */}
            <section className="mb-8 p-6 rounded-lg border border-gray-300 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><User size={20} /> AI & Backend Enhancements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between col-span-full">
                        <span className="font-medium">Q&A on Knowledge Base (RAG)</span>
                        <button className={`px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} disabled>
                            <Upload size={18} className="inline-block mr-2" /> Upload Documents (Conceptual)
                        </button>
                    </div>
                    <div className="flex items-center justify-between col-span-full">
                        <span className="font-medium">Private Fine-Tuned Models</span>
                        <button className={`px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} disabled>
                            Request Access (Conceptual)
                        </button>
                    </div>
                </div>
            </section>

            {/* Analytics & Admin Features (Placeholders) */}
            <section className="mb-8 p-6 rounded-lg border border-gray-300 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><BarChart size={20} /> Analytics & Admin</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between col-span-full">
                        <span className="font-medium">User Chat Analytics Dashboard</span>
                        <button className={`px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} disabled>View Dashboard (Conceptual)</button>
                    </div>
                    <div className="flex items-center justify-between col-span-full">
                        <span className="font-medium">Admin Panel with Moderation</span>
                        <button className={`px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} disabled>Access Admin Panel (Conceptual)</button>
                    </div>
                    <div className="flex items-center justify-between col-span-full">
                        <span className="font-medium">Daily/Weekly Usage Reports</span>
                        <button className={`px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} disabled>Generate Report (Conceptual)</button>
                    </div>
                </div>
            </section>

            {/* Monetization & Growth Ideas (Placeholders) */}
            <section className="p-6 rounded-lg border border-gray-300 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">💸 Monetization & Growth</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between col-span-full">
                        <span className="font-medium">Freemium Model & Plans</span>
                        <button className={`px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} disabled>View Plans (Conceptual)</button>
                    </div>
                    <div className="flex items-center justify-between col-span-full">
                        <span className="font-medium">Referral Program</span>
                        <button className={`px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} disabled>Invite Friends (Conceptual)</button>
                    </div>
                    <div className="flex items-center justify-between col-span-full">
                        <span className="font-medium">Custom Branding for Teams</span>
                        <button className={`px-4 py-2 rounded-lg ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} disabled>Learn More (Conceptual)</button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default SettingsView;
