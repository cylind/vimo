import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Editor, { Monaco } from '@monaco-editor/react';
import './index.css';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [replace, setReplace] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const editorRef = useRef<any>(null);

  const checkConnection = async (inputToken: string) => {
    try {
      const response = await fetch('/api/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inputToken }),
      });
      const { valid } = await response.json();
      if (valid) {
        setIsConnected(true);
        setToken(inputToken);
        fetchFiles(inputToken);
      } else {
        alert('Invalid API token');
      }
    } catch (error) {
      alert('Failed to validate token');
    }
  };

  const fetchFiles = async (token: string) => {
    try {
      const response = await fetch('/api/files', {
        headers: { 'X-API-Token': token },
      });
      const data = await response.json();
      if (data.files) setFiles(data.files);
    } catch (error) {
      alert('Failed to fetch files');
    }
  };

  const loadFile = async (file: string) => {
    if (!isConnected) return;
    try {
      const response = await fetch(`/api/file/${file}`, {
        headers: { 'X-API-Token': token },
      });
      const data = await response.json();
      if (data.content) {
        setContent(data.content);
        setCurrentFile(file);
      }
    } catch (error) {
      alert('Failed to load file');
    }
  };

  const saveToCloud = async () => {
    if (!isConnected || !currentFile) return;
    try {
      const response = await fetch('/api/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-API-Token': token },
        body: JSON.stringify({ file: currentFile, content }),
      });
      if (response.ok) {
        alert('Saved to R2');
      } else {
        alert('Failed to save to R2');
      }
    } catch (error) {
      alert('Failed to save to R2');
    }
  };

  const saveLocally = () => {
    if (!currentFile) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteFile = async (file: string) => {
    if (!isConnected) return;
    try {
      const response = await fetch(`/api/file/${file}`, {
        method: 'DELETE',
        headers: { 'X-API-Token': token },
      });
      if (response.ok) {
        setFiles(files.filter(f => f !== file));
        if (currentFile === file) {
          setCurrentFile(null);
          setContent('');
        }
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      alert('Failed to delete file');
    }
  };

  const renameFile = async () => {
    if (!isConnected || !currentFile || !newFileName) {
      alert('Please select a file and enter a new name');
      return;
    }
    try {
      const response = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Token': token },
        body: JSON.stringify({ oldName: currentFile, newName: newFileName }),
      });
      if (response.ok) {
        setFiles(files.map(f => (f === currentFile ? newFileName : f)));
        setCurrentFile(newFileName);
        setNewFileName('');
      } else {
        alert('Failed to rename file');
      }
    } catch (error) {
      alert('Failed to rename file');
    }
  };

  const createNewFile = async () => {
    if (!isConnected || !newFileName) {
      alert('Please enter a new file name');
      return;
    }
    try {
      const response = await fetch('/api/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-API-Token': token },
        body: JSON.stringify({ file: newFileName, content: '' }),
      });
      if (response.ok) {
        setFiles([...files, newFileName]);
        setCurrentFile(newFileName);
        setContent('');
        setNewFileName('');
      } else {
        alert('Failed to create new file');
      }
    } catch (error) {
      alert('Failed to create new file');
    }
  };

  const handleReplace = () => {
    if (!search || !replace) {
      alert('Please enter both search and replace values');
      return;
    }
    try {
      const newContent = content.replace(new RegExp(search, 'g'), replace);
      setContent(newContent);
    } catch (error) {
      alert('Invalid search pattern');
    }
  };

  const handleSearch = () => {
    if (!editorRef.current || !search) return;
    const editor = editorRef.current;
    editor.deltaDecorations([], [
      {
        range: new window.monaco.Range(1, 1, 1, 1),
        options: {},
      },
    ]);
    const model = editor.getModel();
    if (!model) return;
    const matches = model.findMatches(
      search,
      true,
      false,
      true,
      null,
      true
    );
    const decorations = matches.map(match => ({
      range: match.range,
      options: {
        isWholeLine: false,
        className: 'highlightMatch',
      },
    }));
    editor.deltaDecorations([], decorations);
    if (matches.length > 0) {
      editor.revealRange(matches[0].range);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('customTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {},
    });
    monaco.editor.setTheme('customTheme');
    editor.addCommand(monaco.KeyCode.Escape, () => {
      editor.deltaDecorations([], []);
    });
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="w-64 bg-gray-800 p-4">
        <button
          className={`w-full py-2 mb-4 ${isConnected ? 'bg-green-500' : 'bg-gray-500'} text-white rounded`}
          onClick={() => setShowTokenModal(true)}
        >
          {isConnected ? 'Connected' : 'Connect to Cloud'}
        </button>
        {isConnected && (
          <div>
            <h2 className="text-lg font-bold mb-2">Files</h2>
            <ul>
              {files.map(file => (
                <li key={file} className="flex justify-between items-center">
                  <span onClick={() => loadFile(file)} className="cursor-pointer">{file}</span>
                  <button onClick={() => deleteFile(file)} className="text-red-500">Delete</button>
                </li>
              ))}
            </ul>
            <input
              type="text"
              placeholder="New file name or rename"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="mt-2 w-full p-1 bg-gray-700 rounded"
            />
            <button
              onClick={createNewFile}
              className="mt-2 w-full p-2 bg-blue-500 rounded"
            >
              Create New File
            </button>
            {currentFile && (
              <button
                onClick={renameFile}
                className="mt-2 w-full p-2 bg-purple-500 rounded"
              >
                Rename File
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 bg-gray-700 rounded mr-2"
          />
          <input
            type="text"
            placeholder="Replace"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            className="p-2 bg-gray-700 rounded mr-2"
          />
          <button onClick={handleSearch} className="p-2 bg-teal-500 rounded">Find</button>
          <button onClick={handleReplace} className="p-2 bg-blue-500 rounded ml-2">Replace</button>
          <button onClick={saveLocally} className="p-2 bg-yellow-500 rounded ml-2">Save Locally</button>
          {isConnected && (
            <button onClick={saveToCloud} className="p-2 bg-green-500 rounded ml-2">Save to Cloud</button>
          )}
        </div>
        <Editor
          height="80vh"
          defaultLanguage="yaml"
          value={content}
          onChange={(value) => setContent(value || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
        />
      </div>
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-lg mb-2">Enter API Token</h2>
            <input
              type="password"
              onChange={(e) => setToken(e.target.value)}
              className="p-2 bg-gray-700 rounded w-full mb-2"
            />
            <button
              onClick={() => {
                checkConnection(token);
                setShowTokenModal(false);
              }}
              className="p-2 bg-blue-500 rounded"
            >
              Connect
            </button>
            <button
              onClick={() => setShowTokenModal(false)}
              className="p-2 bg-red-500 rounded ml-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <style>{`
        .highlightMatch {
          background-color: #4CAF50;
          color: white;
        }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);