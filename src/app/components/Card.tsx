'use client';

import React, { useState } from "react";

interface CardProps {
  title: string;
  description?: string;
  tags?: string[];
  assignee?: string;
  onEdit?: (data: { title: string; description?: string; tags?: string[]; assignee?: string }) => void;
  onDelete?: () => void;
}

const Card: React.FC<CardProps> = ({ title, description, tags, assignee, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description || "");
  const [editTags, setEditTags] = useState(tags ? tags.join(", ") : "");
  const [editAssignee, setEditAssignee] = useState(assignee || "");

  const handleSave = () => {
    if (onEdit) {
      onEdit({
        title: editTitle,
        description: editDescription,
        tags: editTags.split(",").map(t => t.trim()).filter(Boolean),
        assignee: editAssignee,
      });
    }
    setEditing(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 w-72 border border-gray-200 dark:border-gray-700 transition-all">
      <div className="flex justify-between items-center mb-2">
        {editing ? (
          <input
            className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none w-40"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
          />
        ) : (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{title}</h3>
        )}
        <div className="flex gap-2">
          <button
            className="text-xs text-blue-500 hover:underline"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Hide" : "Details"}
          </button>
          <button
            className="text-xs text-gray-500 hover:underline"
            onClick={() => setEditing((prev) => !prev)}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            className="text-xs text-red-500 hover:underline"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
      {(expanded || editing) && (
        <div className="mb-2">
          {editing ? (
            <>
              <textarea
                className="w-full text-gray-700 dark:text-gray-300 text-sm mb-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={2}
                placeholder="Description"
              />
              <input
                className="w-full text-xs mb-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1"
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                placeholder="Tags (comma separated)"
              />
              <input
                className="w-full text-xs mb-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1"
                value={editAssignee}
                onChange={e => setEditAssignee(e.target.value)}
                placeholder="Assignee"
              />
              <button
                className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                onClick={handleSave}
              >
                Save
              </button>
            </>
          ) : (
            <>
              {description && (
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{description}</p>
              )}
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {assignee && (
                <div className="text-xs text-gray-500 dark:text-gray-400">Assigned to: {assignee}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Card; 