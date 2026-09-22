import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User as UserIcon } from 'lucide-react';
import { AuditComment } from '../../types';
import api from '../../services/api';
import { toast } from 'sonner';

interface ThreadedCommentsProps {
  questionId: string;
  serviceId: number;
  processId: string;
  customerId: string;
  initialComments: AuditComment[];
  onCommentAdded?: (comment: AuditComment) => void;
}

export const ThreadedComments: React.FC<ThreadedCommentsProps> = ({
  questionId,
  serviceId,
  processId,
  customerId,
  initialComments,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<AuditComment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track which comment IDs we already know about so the sync is additive
  const knownIds = useRef(new Set(initialComments.map((c) => c._id)));

  // When the parent refreshes auditData, merge any new server comments in
  // without discarding optimistic ones we already appended locally.
  useEffect(() => {
    setComments((prev) => {
      const localIds = new Set(prev.map((c) => c._id));
      const newFromServer = initialComments.filter((c) => !localIds.has(c._id));
      if (newFromServer.length === 0) return prev; // nothing changed
      // Also track newly discovered IDs
      newFromServer.forEach((c) => knownIds.current.add(c._id));
      return [...prev, ...newFromServer];
    });
  }, [initialComments]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await api.post('/comments', {
        questionId,
        serviceId,
        processId,
        customerId,
        comment: newComment.trim(),
      });

      if (res.data.success) {
        setComments((prev) => [...prev, res.data.comment]);
        if (onCommentAdded) onCommentAdded(res.data.comment);
        setNewComment('');
        toast.success('Comment reply posted.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (userType?: number) => {
    switch (userType) {
      case 1:
        return <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded">Admin</span>;
      case 2:
        return <span className="px-1.5 py-0.5 text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded">QSA</span>;
      case 3:
        return <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">QA</span>;
      case 4:
        return <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">Consultant</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded">Customer</span>;
    }
  };

  const getAvatarStyle = (userType?: number) => {
    switch (userType) {
      case 1:
        return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 2:
        return 'bg-teal-100 text-teal-700 border border-teal-200';
      case 3:
        return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 4:
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      default:
        return 'bg-sky-100 text-sky-700 border border-sky-200';
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
          <MessageSquare className="w-4 h-4 text-slate-700" />
          <span>Requirement Discussion</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
          {comments.length} message{comments.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No comments posted yet for this control requirement.</p>
        ) : (
          comments.map((c) => (
            <div key={c._id} className="flex items-start space-x-2.5 text-xs">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${getAvatarStyle(c.loginUserId?.userType)}`}>
                {(c.loginUserId?.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-900">{c.loginUserId?.fullName || 'User'}</span>
                    {getRoleBadge(c.loginUserId?.userType)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(c.loginUserDate || c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                    {new Date(c.loginUserDate || c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">{c.comments}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handlePost} className="flex gap-2 pt-1">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add an audit discussion note or reply..."
          className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-800 placeholder:text-slate-400 transition"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 flex items-center space-x-1.5 shadow-xs"
        >
          <Send className="w-3.5 h-3.5 text-white" />
          <span>Reply</span>
        </button>
      </form>
    </div>
  );
};
