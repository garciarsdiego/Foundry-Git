import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Loader, ArrowLeft, MoreHorizontal } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const PRIORITY_COLORS = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-gray-500',
};

function CardItem({ card, onClick, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onClick={() => onClick(card)}
      className="bg-[#1e2128] border border-[#2a2d35] rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing hover:border-blue-500/40 hover:bg-[#1e2128]/80 transition-all group select-none"
    >
      <div className="text-sm font-medium text-white mb-2 leading-snug">{card.title}</div>
      {card.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{card.description}</p>}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${PRIORITY_COLORS[card.priority] || 'text-gray-500'}`}>
          {card.priority}
        </span>
        {card.github_issue_number && (
          <span className="text-xs text-gray-500">#{card.github_issue_number}</span>
        )}
      </div>
    </div>
  );
}

function NewCardModal({ boardId, columnId, projectId, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return setError('Title is required');
    setSaving(true);
    try {
      await api.post('/cards', { project_id: projectId, board_id: boardId, column_id: columnId, title, description, priority });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="Task title..." className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Priority</label>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Card'}
        </button>
      </div>
    </form>
  );
}

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [cards, setCards] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newCardModal, setNewCardModal] = useState(null); // { columnId }
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const dragCardRef = useRef(null);

  async function load() {
    try {
      const proj = await api.get(`/projects/${id}`);
      setProject(proj);
      const boards = await api.get(`/boards?project_id=${id}`);
      if (boards.length > 0) {
        const boardData = await api.get(`/boards/${boards[0].id}`);
        setBoard(boardData);
        const cardData = await api.get(`/cards?board_id=${boards[0].id}`);
        setCards(cardData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function createBoard() {
    try {
      await api.post('/boards', { project_id: id, name: 'Main Board' });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  function handleDragStart(e, card) {
    dragCardRef.current = card;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  }

  function handleDragOver(e, columnId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(columnId);
  }

  function handleDragLeave() {
    setDragOverColumnId(null);
  }

  async function handleDrop(e, columnId) {
    e.preventDefault();
    setDragOverColumnId(null);
    const card = dragCardRef.current;
    if (!card || card.column_id === columnId) return;
    // Capture original column_id before clearing the ref and mutating state
    const originalColumnId = card.column_id;
    dragCardRef.current = null;

    // Optimistic update
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, column_id: columnId } : c));

    try {
      await api.put(`/cards/${card.id}`, { column_id: columnId });
    } catch (err) {
      console.error('Failed to move card:', err);
      // Revert on failure using the captured original column_id
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, column_id: originalColumnId } : c));
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader size={20} className="animate-spin mr-2" /> Loading board...
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d35] bg-[#16181c] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to={`/projects/${id}`} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-semibold text-white">{project?.name} — Board</h1>
        </div>
      </div>

      {/* Board */}
      {!board ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="mb-4">No board yet for this project.</p>
            <button onClick={createBoard} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Create Board</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full" style={{ minWidth: `${(board.columns?.length || 4) * 280 + 24}px` }}>
            {(board.columns || []).map(col => {
              const colCards = cards.filter(c => c.column_id === col.id);
              const isDragTarget = dragOverColumnId === col.id;
              return (
                <div
                  key={col.id}
                  className="flex flex-col w-64 flex-shrink-0"
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-300">{col.name}</h3>
                      <span className="text-xs bg-[#2a2d35] text-gray-400 rounded-full px-2 py-0.5">{colCards.length}</span>
                    </div>
                    <button
                      onClick={() => setNewCardModal({ columnId: col.id, boardId: board.id })}
                      className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className={`flex-1 overflow-y-auto rounded-lg transition-colors min-h-16 ${isDragTarget ? 'bg-blue-500/10 ring-2 ring-blue-500/30' : ''}`}>
                    {colCards.map(card => (
                      <CardItem
                        key={card.id}
                        card={card}
                        onClick={() => navigate(`/projects/${id}/board/${card.id}`)}
                        onDragStart={handleDragStart}
                      />
                    ))}
                    {colCards.length === 0 && (
                      <div
                        onClick={() => setNewCardModal({ columnId: col.id, boardId: board.id })}
                        className={`border-2 border-dashed rounded-lg p-4 text-center text-gray-600 text-xs cursor-pointer transition-colors ${
                          isDragTarget
                            ? 'border-blue-500/50 text-blue-400'
                            : 'border-[#2a2d35] hover:border-[#3a3d45] hover:text-gray-400'
                        }`}
                      >
                        {isDragTarget ? 'Drop here' : '+ Add card'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {newCardModal && (
        <Modal isOpen onClose={() => setNewCardModal(null)} title="Add Card">
          <NewCardModal
            boardId={newCardModal.boardId}
            columnId={newCardModal.columnId}
            projectId={id}
            onClose={() => setNewCardModal(null)}
            onCreated={load}
          />
        </Modal>
      )}
    </div>
  );
}
