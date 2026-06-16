import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRequest, updateStatus, uploadDeliverable, getNotes, addNote, assignRequest, updatePriority, updateDueDate } from '../../services/requestService';
import { getEmployees } from '../../services/employeeService';
import StatusBadge from '../../components/StatusBadge';
import FileUpload from '../../components/FileUpload';
import { useAuth } from '../../context/AuthContext';

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 sm:w-44 shrink-0">{label}</span>
      <span className="text-sm text-[#1C1C1C]">{value || '—'}</span>
    </div>
  );
}

export default function RequestManage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isRoot = user?.role === 'root_admin';

  const [request, setRequest]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusMsg, setStatusMsg]           = useState('');
  const [statusError, setStatusError]       = useState('');
  const [statusLoading, setStatusLoading]   = useState(false);
  const [deliverableFiles, setDeliverableFiles] = useState([]);
  const [deliverableMsg, setDeliverableMsg]     = useState('');
  const [deliverableError, setDeliverableError] = useState('');
  const [deliverableLoading, setDeliverableLoading] = useState(false);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [dueDateLoading, setDueDateLoading]   = useState(false);
  const [dueDateInput, setDueDateInput]       = useState('');
  const [notes, setNotes]                   = useState([]);
  const [noteText, setNoteText]             = useState('');
  const [noteLoading, setNoteLoading]       = useState(false);
  const [employees, setEmployees]           = useState([]);
  const [assignTo, setAssignTo]             = useState('');
  const [assignMsg, setAssignMsg]           = useState('');
  const [assignError, setAssignError]       = useState('');

  useEffect(() => {
    Promise.all([
      getRequest(id),
      getNotes(id),
      isRoot ? getEmployees() : Promise.resolve({ data: [] }),
    ]).then(([reqRes, notesRes, empRes]) => {
      setRequest(reqRes.data);
      setSelectedStatus(reqRes.data.status);
      setDueDateInput(reqRes.data.due_date || '');
      setAssignTo(reqRes.data.assigned_to || '');
      setNotes(notesRes.data);
      setEmployees(empRes.data);
    }).catch(err => {
      if (err.response?.status === 404) setError('Request not found.');
      else setError('Failed to load request.');
    }).finally(() => setLoading(false));
  }, [id, isRoot]);

  async function handleStatusUpdate() {
    setStatusMsg(''); setStatusError(''); setStatusLoading(true);
    try {
      await updateStatus(id, selectedStatus);
      setRequest(prev => ({ ...prev, status: selectedStatus }));
      setStatusMsg('Status updated successfully.');
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Failed to update status.');
    } finally { setStatusLoading(false); }
  }

  async function handleDeliverableUpload() {
    if (deliverableFiles.length === 0) { setDeliverableError('Please select a file.'); return; }
    setDeliverableMsg(''); setDeliverableError(''); setDeliverableLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', deliverableFiles[0]);
      await uploadDeliverable(id, fd);
      setDeliverableMsg('Deliverable uploaded. Request marked as Delivered.');
      setDeliverableFiles([]);
      const res = await getRequest(id);
      setRequest(res.data);
      setSelectedStatus('Delivered');
    } catch (err) {
      setDeliverableError(err.response?.data?.message || 'Upload failed.');
    } finally { setDeliverableLoading(false); }
  }

  async function handleTogglePriority() {
    const next = request.priority === 'Urgent' ? 'Normal' : 'Urgent';
    setPriorityLoading(true);
    try {
      await updatePriority(id, next);
      setRequest(prev => ({ ...prev, priority: next }));
    } catch { /* silent */ } finally { setPriorityLoading(false); }
  }

  async function handleDueDateSave() {
    setDueDateLoading(true);
    try {
      await updateDueDate(id, dueDateInput || null);
      setRequest(prev => ({ ...prev, due_date: dueDateInput || null }));
    } catch { /* silent */ } finally { setDueDateLoading(false); }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setNoteLoading(true);
    try {
      const res = await addNote(id, noteText);
      setNotes(prev => [res.data, ...prev]);
      setNoteText('');
    } catch {
      // silent
    } finally { setNoteLoading(false); }
  }

  async function handleReassign() {
    setAssignMsg(''); setAssignError('');
    try {
      await assignRequest(id, Number(assignTo));
      const emp = employees.find(e => e.id === Number(assignTo));
      setRequest(prev => ({ ...prev, assigned_to: Number(assignTo), assigned_to_name: emp?.name }));
      setAssignMsg('Request reassigned successfully.');
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Reassignment failed.');
    }
  }

  function downloadFile(fileId, originalName) {
    const token = localStorage.getItem('token');
    fetch(`/api/files/${fileId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = originalName; a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10 text-gray-400 text-sm">Loading…</div>;
  if (error)   return <div className="max-w-3xl mx-auto px-4 py-10 text-[#C53030] text-sm">{error}</div>;

  const clientFiles  = request.files?.filter(f => f.file_type === 'client_upload') || [];
  const deliverables = request.files?.filter(f => f.file_type === 'deliverable')   || [];
  const backLink     = isRoot ? '/root/requests' : '/admin/requests';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <Link to={backLink} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1A3C34] transition-colors">
        ← Back to {isRoot ? 'All' : 'My'} Requests
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] tracking-tight">Manage Request</h1>
          <p className="text-sm text-gray-400 mt-1">{request.reference_number}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Section 1 — Client Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">Client Information</h2>
        <InfoRow label="Client Name"      value={request.client_name} />
        <InfoRow label="Client Email"     value={request.client_email} />
        <InfoRow label="Assigned To"      value={request.assigned_to_name} />
        <InfoRow label="Document Type"    value={request.document_type} />
        <InfoRow label="Full Name"        value={request.full_name} />
        <InfoRow label="Date of Birth"    value={request.date_of_birth} />
        <InfoRow label="National ID No."  value={request.national_id_number} />
        <InfoRow label="Phone"            value={request.phone} />
        <InfoRow label="Address"          value={request.address} />
        <InfoRow label="Payment Status"   value={request.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'} />
        <InfoRow label="Payment Ref."     value={request.payment_reference} />
        <InfoRow label="Submitted"        value={new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} />
      </div>

      {/* Section 2 — Client Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">Client Documents</h2>
        {clientFiles.length === 0 ? (
          <p className="text-sm text-gray-400">No documents uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {clientFiles.map(f => (
              <li key={f.id} className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-[#1C1C1C]">{f.original_name}</span>
                  <span className="ml-2 text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
                <button onClick={() => downloadFile(f.id, f.original_name)} className="text-sm bg-[#1A3C34] text-white rounded-md px-4 py-1.5 hover:bg-[#122B25] transition-colors">
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Section 3 — Status Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">Status Management</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Update Status</label>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm">
              {['Pending', 'In Progress', 'Delivered', 'Cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button onClick={handleStatusUpdate} disabled={statusLoading} className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 font-medium hover:bg-[#122B25] transition-colors disabled:opacity-60">
            {statusLoading ? 'Updating…' : 'Update Status'}
          </button>
        </div>
        {statusMsg   && <p className="mt-3 text-sm text-[#2F855A]">{statusMsg}</p>}
        {statusError && <p className="mt-3 text-sm text-[#C53030]">{statusError}</p>}

        <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Due Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dueDateInput}
                onChange={e => setDueDateInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm"
              />
              <button onClick={handleDueDateSave} disabled={dueDateLoading} className="border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50 transition-colors disabled:opacity-60">
                {dueDateLoading ? '…' : 'Set'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Priority</label>
            <button
              onClick={handleTogglePriority}
              disabled={priorityLoading}
              className={`rounded-md px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                request.priority === 'Urgent'
                  ? 'bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {request.priority === 'Urgent' ? '🔴 Urgent — click to set Normal' : '⚪ Normal — click to set Urgent'}
            </button>
          </div>
        </div>
      </div>

      {/* Section 4 — Upload Deliverable */}
      {(request.status === 'In Progress' || request.status === 'Delivered') && (
        <div className="bg-white rounded-xl shadow-sm border border-[#2F855A] p-6">
          <h2 className="font-semibold text-[#2F855A] mb-2">Upload Deliverable</h2>
          <p className="text-sm text-gray-500 mb-4">Attach the processed document for the client to download.</p>
          {deliverables.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2 font-medium">Already uploaded:</p>
              <ul className="space-y-2">
                {deliverables.map(f => (
                  <li key={f.id} className="flex items-center justify-between bg-green-50 rounded-md px-4 py-2 text-sm">
                    <span className="font-medium">{f.original_name}</span>
                    <button onClick={() => downloadFile(f.id, f.original_name)} className="text-[#2F855A] hover:underline text-xs">Download</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <FileUpload files={deliverableFiles} onChange={setDeliverableFiles} error={deliverableError} />
          {deliverableMsg && <p className="mt-3 text-sm text-[#2F855A]">{deliverableMsg}</p>}
          <button onClick={handleDeliverableUpload} disabled={deliverableLoading} className="mt-4 bg-[#C9A03A] text-white rounded-md px-6 py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-60">
            {deliverableLoading ? 'Uploading…' : 'Upload & Deliver'}
          </button>
        </div>
      )}

      {/* Section 5 — Reassign (root_admin only) */}
      {isRoot && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-[#1A3C34] mb-4">Reassign Request</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Assign to Employee</label>
              <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm">
                <option value="">Select employee…</option>
                {employees.filter(e => e.is_active).map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                ))}
              </select>
            </div>
            <button onClick={handleReassign} disabled={!assignTo} className="bg-[#C9A03A] text-white rounded-md px-6 py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-60">
              Reassign
            </button>
          </div>
          {assignMsg   && <p className="mt-3 text-sm text-[#2F855A]">{assignMsg}</p>}
          {assignError && <p className="mt-3 text-sm text-[#C53030]">{assignError}</p>}
        </div>
      )}

      {/* Section 6 — Internal Notes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-[#1A3C34] mb-4">Internal Notes</h2>
        <div className="flex gap-3 mb-4">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={2}
            placeholder="Add an internal note…"
            className="flex-1 border border-gray-300 rounded-md px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-sm resize-none"
          />
          <button onClick={handleAddNote} disabled={noteLoading || !noteText.trim()} className="self-start bg-[#1A3C34] text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-[#122B25] transition-colors disabled:opacity-60">
            {noteLoading ? '…' : 'Add'}
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map(n => (
              <li key={n.id} className="bg-gray-50 rounded-md px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#1A3C34]">{n.author_name}</span>
                  <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-[#1C1C1C]">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Section 7 — Audit Log */}
      {request.logs?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-[#1A3C34] mb-4">Activity Log</h2>
          <ul className="space-y-2">
            {request.logs.map(log => (
              <li key={log.id} className="flex items-center gap-3 text-sm text-gray-500">
                <span className="shrink-0 text-xs text-gray-300">
                  {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>
                  <strong className="text-[#1C1C1C]">{log.changed_by_name}</strong> changed status from{' '}
                  <strong>{log.old_status || '—'}</strong> to <strong>{log.new_status}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
