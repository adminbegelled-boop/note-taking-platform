import React, { useState, useEffect } from 'react';
import * as api from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Auth form states
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState('user');
  const [authInterests, setAuthInterests] = useState('coding, reading');

  // Notes state
  const [notes, setNotes] = useState([]);
  const [notesPage, setNotesPage] = useState(1);
  const [notesTotalPages, setNotesTotalPages] = useState(1);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);

  // Admin All Notes state
  const [allNotes, setAllNotes] = useState([]);
  const [allNotesPage, setAllNotesPage] = useState(1);
  const [allNotesTotalPages, setAllNotesTotalPages] = useState(1);

  // Admin Users state
  const [usersList, setUsersList] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [newUserInterests, setNewUserInterests] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);

  // Public Posts state
  const [posts, setPosts] = useState([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');

  // Scenario 1: Group by Interests state
  const [interestGroups, setInterestGroups] = useState([]);

  // Self Profile & Interests editing
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [myProfileName, setMyProfileName] = useState('');
  const [myProfileInterests, setMyProfileInterests] = useState('');

  // Scenario 2: User Posts ($lookup) state
  const [lookupUserId, setLookupUserId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  useEffect(() => {
    checkLoggedInUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setMyProfileName(currentUser.name || '');
    setMyProfileInterests((currentUser.interests || []).join(', '));
    if (activeTab === 'notes') fetchMyNotes(notesPage);
    if (activeTab === 'all-notes' && currentUser.role === 'admin') fetchAllNotes(allNotesPage);
    if (activeTab === 'users' && currentUser.role === 'admin') fetchUsers(usersPage);
    if (activeTab === 'posts') fetchPosts(postsPage);
    if (activeTab === 'scenario1') fetchScenario1();
  }, [currentUser, activeTab, notesPage, allNotesPage, usersPage, postsPage]);

  async function checkLoggedInUser() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const me = await api.getMe();
      setCurrentUser(me);
    } catch {
      localStorage.removeItem('token');
      setCurrentUser(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setMessage('Logged out successfully.');
  }

  // --- Auth Handlers ---
  async function handleAuthSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (authMode === 'login') {
        const res = await api.login({ email: authEmail, password: authPassword });
        localStorage.setItem('token', res.token);
        setCurrentUser(res.user);
        setMessage(`Welcome back, ${res.user.name}!`);
      } else {
        const interestsArr = authInterests.split(',').map((s) => s.trim()).filter(Boolean);
        const res = await api.register({
          name: authName,
          email: authEmail,
          password: authPassword,
          role: authRole,
          interests: interestsArr,
        });
        localStorage.setItem('token', res.token);
        setCurrentUser(res.user);
        setMessage(`Account created for ${res.user.name}!`);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function quickLogin(email, password) {
    setAuthEmail(email);
    setAuthPassword(password);
    api.login({ email, password })
      .then((res) => {
        localStorage.setItem('token', res.token);
        setCurrentUser(res.user);
        setMessage(`Logged in as ${res.user.name} (${res.user.role})`);
        setError('');
      })
      .catch((err) => setError(err.message));
  }

  // --- Self Profile Handlers ---
  async function handleUpdateMyInterests(e) {
    e.preventDefault();
    setError('');
    try {
      const interestsArr = myProfileInterests.split(',').map((s) => s.trim()).filter(Boolean);
      const updated = await api.updateMyProfile({ name: myProfileName, interests: interestsArr });
      setCurrentUser((prev) => ({ ...prev, name: updated.name, interests: updated.interests }));
      setMessage('Profile & interests updated successfully!');
      setShowEditProfile(false);
      if (activeTab === 'scenario1') fetchScenario1();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- Notes Handlers ---
  async function fetchMyNotes(page = 1) {
    try {
      const res = await api.getNotes(page, 5);
      setNotes(res.data);
      setNotesTotalPages(res.pages || 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveNote(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingNoteId) {
        await api.updateNote(editingNoteId, { title: noteTitle, content: noteContent });
        setMessage('Note updated successfully!');
      } else {
        await api.createNote({ title: noteTitle, content: noteContent });
        setMessage('Note created successfully!');
      }
      setNoteTitle('');
      setNoteContent('');
      setEditingNoteId(null);
      fetchMyNotes(notesPage);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteNote(id) {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.deleteNote(id);
      setMessage('Note deleted.');
      fetchMyNotes(notesPage);
    } catch (err) {
      setError(err.message);
    }
  }

  // --- Admin All Notes ---
  async function fetchAllNotes(page = 1) {
    try {
      const res = await api.getAllNotes(page, 5);
      setAllNotes(res.data);
      setAllNotesTotalPages(res.pages || 1);
    } catch (err) {
      setError(err.message);
    }
  }

  // --- Admin User Management ---
  async function fetchUsers(page = 1) {
    try {
      const res = await api.getUsers(page, 5);
      setUsersList(res.data);
      setUsersTotalPages(res.pages || 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    setError('');
    try {
      const interestsArr = newUserInterests.split(',').map((s) => s.trim()).filter(Boolean);
      if (editingUserId) {
        await api.updateUser(editingUserId, {
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          interests: interestsArr,
          ...(newUserPassword ? { password: newUserPassword } : {}),
        });
        setMessage('User updated.');
      } else {
        await api.createUser({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          interests: interestsArr,
        });
        setMessage('User created.');
      }
      setEditingUserId(null);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers(usersPage);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.deleteUser(id);
      setMessage('User removed.');
      fetchUsers(usersPage);
    } catch (err) {
      setError(err.message);
    }
  }

  // --- Posts Handlers ---
  async function fetchPosts(page = 1) {
    try {
      const res = await api.getPosts(page, 5);
      setPosts(res.data);
      setPostsTotalPages(res.pages || 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    try {
      await api.createPost({ title: postTitle, body: postBody });
      setPostTitle('');
      setPostBody('');
      setMessage('Post published!');
      fetchPosts(postsPage);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeletePost(id) {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.deletePost(id);
      setMessage('Post deleted.');
      fetchPosts(postsPage);
    } catch (err) {
      setError(err.message);
    }
  }

  // --- Aggregations Handlers ---
  async function fetchScenario1() {
    try {
      const res = await api.groupByInterests();
      setInterestGroups(res);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleScenario2Lookup(userId) {
    setError('');
    setLookupResult(null);
    try {
      const res = await api.getUserPosts(userId);
      setLookupResult(res);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <header>
        <div>
          <h2 style={{ margin: 0 }}>Note-Taking & Aggregation Platform</h2>
          <small style={{ color: '#666' }}>Role-Based Access & MongoDB Aggregation Optimization</small>
        </div>
        {currentUser && (
          <div style={{ textAlign: 'right' }}>
            <div>
              <strong>{currentUser.name}</strong> ({currentUser.email}){' '}
              <span className={`badge ${currentUser.role === 'admin' ? 'admin-badge' : ''}`}>
                {currentUser.role.toUpperCase()}
              </span>{' '}
              <button onClick={handleLogout} style={{ marginLeft: 8 }}>
                Logout
              </button>
            </div>
            <div style={{ marginTop: 6 }}>
              <small>Interests: </small>
              {currentUser.interests && currentUser.interests.length > 0 ? (
                currentUser.interests.map((i) => (
                  <span
                    key={i}
                    className="badge"
                    style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '11px' }}
                  >
                    {i}
                  </span>
                ))
              ) : (
                <small style={{ color: '#888' }}>None set</small>
              )}
              <button
                onClick={() => setShowEditProfile(!showEditProfile)}
                style={{ marginLeft: 8, fontSize: '11px', padding: '2px 8px' }}
              >
                {showEditProfile ? 'Close' : '✏️ Edit Interests'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Profile & Interests Edit Card */}
      {currentUser && showEditProfile && (
        <div className="card" style={{ background: '#f8fafc', borderColor: '#cbd5e1', marginBottom: 20 }}>
          <h4>Update Your Profile & Interests</h4>
          <form onSubmit={handleUpdateMyInterests}>
            <label>Name:</label>
            <input
              type="text"
              value={myProfileName}
              onChange={(e) => setMyProfileName(e.target.value)}
              required
            />
            <label>Interests (comma-separated, e.g. chess, reading, coding):</label>
            <input
              type="text"
              value={myProfileInterests}
              onChange={(e) => setMyProfileInterests(e.target.value)}
              placeholder="chess, reading, swimming, AI"
            />
            <button type="submit">Save Changes</button>
            <button
              type="button"
              style={{ marginLeft: 8 }}
              onClick={() => setShowEditProfile(false)}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {error && <div className="error">⚠️ {error}</div>}
      {message && <div className="success">ℹ️ {message}</div>}

      {/* --- Unauthenticated View --- */}
      {!currentUser && (
        <div className="card">
          <h3>{authMode === 'login' ? 'Login' : 'Register Account'}</h3>

          <div style={{ marginBottom: 12 }}>
            <button
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <>
                <label>Full Name:</label>
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
                <label>Role:</label>
                <select value={authRole} onChange={(e) => setAuthRole(e.target.value)}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <label>Interests (comma separated):</label>
                <input
                  type="text"
                  value={authInterests}
                  onChange={(e) => setAuthInterests(e.target.value)}
                  placeholder="e.g. chess, reading, coding"
                />
              </>
            )}

            <label>Email Address:</label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />

            <label>Password:</label>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <button type="submit" style={{ padding: '8px 16px', background: '#2b6cb0', color: '#fff' }}>
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #eee' }}>
            <p><strong>Quick Test Accounts (Pre-seeded):</strong></p>
            <button
              onClick={() => quickLogin('admin@example.com', 'Password123!')}
              style={{ marginRight: 8 }}
            >
              Login as Admin (admin@example.com)
            </button>
            <button
              onClick={() => quickLogin('alice@example.com', 'Password123!')}
              style={{ marginRight: 8 }}
            >
              Login as Alice (alice@example.com)
            </button>
            <button onClick={() => quickLogin('bob@example.com', 'Password123!')}>
              Login as Bob (bob@example.com)
            </button>
          </div>
        </div>
      )}

      {/* --- Authenticated Navigation & Views --- */}
      {currentUser && (
        <div>
          <nav style={{ marginBottom: 20 }}>
            <button
              className={activeTab === 'notes' ? 'active' : ''}
              onClick={() => setActiveTab('notes')}
            >
              📝 My Notes
            </button>

            {currentUser.role === 'admin' && (
              <>
                <button
                  className={activeTab === 'all-notes' ? 'active' : ''}
                  onClick={() => setActiveTab('all-notes')}
                >
                  🌐 All Notes (Admin)
                </button>
                <button
                  className={activeTab === 'users' ? 'active' : ''}
                  onClick={() => setActiveTab('users')}
                >
                  👥 Manage Users (Admin)
                </button>
              </>
            )}

            <button
              className={activeTab === 'posts' ? 'active' : ''}
              onClick={() => setActiveTab('posts')}
            >
              📢 Public Posts
            </button>
            <button
              className={activeTab === 'scenario1' ? 'active' : ''}
              onClick={() => setActiveTab('scenario1')}
            >
              📊 Group by Interests
            </button>
            <button
              className={activeTab === 'scenario2' ? 'active' : ''}
              onClick={() => setActiveTab('scenario2')}
            >
              🔗 User Posts
            </button>
          </nav>

          {/* TAB 1: My Notes */}
          {activeTab === 'notes' && (
            <div>
              <div className="card">
                <h4>{editingNoteId ? 'Edit Note' : 'Create New Note'}</h4>
                <form onSubmit={handleSaveNote}>
                  <input
                    type="text"
                    placeholder="Note Title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    required
                  />
                  <textarea
                    rows={3}
                    placeholder="Note Content"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    required
                  />
                  <button type="submit">{editingNoteId ? 'Update Note' : 'Add Note'}</button>
                  {editingNoteId && (
                    <button
                      type="button"
                      style={{ marginLeft: 8 }}
                      onClick={() => {
                        setEditingNoteId(null);
                        setNoteTitle('');
                        setNoteContent('');
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </form>
              </div>

              <h3>My Notes ({notes.length})</h3>
              {notes.length === 0 ? (
                <p>No notes found. Create your first note above!</p>
              ) : (
                notes.map((n) => (
                  <div key={n._id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: '0 0 6px' }}>{n.title}</h4>
                      <small style={{ color: '#888' }}>{new Date(n.createdAt).toLocaleString()}</small>
                    </div>
                    <p style={{ margin: '6px 0 12px' }}>{n.content}</p>
                    <button
                      onClick={() => {
                        setEditingNoteId(n._id);
                        setNoteTitle(n.title);
                        setNoteContent(n.content);
                      }}
                      style={{ marginRight: 8 }}
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDeleteNote(n._id)} style={{ color: 'red' }}>
                      Delete
                    </button>
                  </div>
                ))
              )}

              <div className="pagination">
                <button
                  disabled={notesPage <= 1}
                  onClick={() => setNotesPage((p) => Math.max(1, p - 1))}
                >
                  ◀ Previous
                </button>
                <span>
                  Page {notesPage} of {notesTotalPages}
                </span>
                <button
                  disabled={notesPage >= notesTotalPages}
                  onClick={() => setNotesPage((p) => p + 1)}
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Admin All Notes */}
          {activeTab === 'all-notes' && currentUser.role === 'admin' && (
            <div>
              <h3>All Notes Across Platform (Admin View)</h3>
              {allNotes.map((n) => (
                <div key={n._id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h4 style={{ margin: '0 0 6px' }}>{n.title}</h4>
                    <span className="badge">
                      Owner: {n.owner?.name || 'Unknown'} ({n.owner?.email})
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 12px' }}>{n.content}</p>
                  <small style={{ color: '#888' }}>
                    Created: {new Date(n.createdAt).toLocaleString()} | ID: {n._id}
                  </small>
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => handleDeleteNote(n._id)} style={{ color: 'red' }}>
                      Admin Delete
                    </button>
                  </div>
                </div>
              ))}

              <div className="pagination">
                <button
                  disabled={allNotesPage <= 1}
                  onClick={() => setAllNotesPage((p) => Math.max(1, p - 1))}
                >
                  ◀ Previous
                </button>
                <span>
                  Page {allNotesPage} of {allNotesTotalPages}
                </span>
                <button
                  disabled={allNotesPage >= allNotesTotalPages}
                  onClick={() => setAllNotesPage((p) => p + 1)}
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Admin Users Management */}
          {activeTab === 'users' && currentUser.role === 'admin' && (
            <div>
              <div className="card">
                <h4>{editingUserId ? 'Edit User' : 'Add New User'}</h4>
                <form onSubmit={handleSaveUser}>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder={editingUserId ? 'Password (leave blank to keep current)' : 'Password'}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    {...(!editingUserId ? { required: true } : {})}
                  />
                  <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Interests (e.g. chess, reading)"
                    value={newUserInterests}
                    onChange={(e) => setNewUserInterests(e.target.value)}
                  />
                  <button type="submit">{editingUserId ? 'Update User' : 'Add User'}</button>
                  {editingUserId && (
                    <button
                      type="button"
                      style={{ marginLeft: 8 }}
                      onClick={() => {
                        setEditingUserId(null);
                        setNewUserName('');
                        setNewUserEmail('');
                        setNewUserPassword('');
                        setNewUserInterests('');
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </form>
              </div>

              <h3>Users List (Admin View)</h3>
              {usersList.map((u) => (
                <div key={u._id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h4 style={{ margin: 0 }}>
                      {u.name} ({u.email})
                    </h4>
                    <span className={`badge ${u.role === 'admin' ? 'admin-badge' : ''}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0' }}>
                    Interests: {(u.interests || []).map((i) => <span key={i} className="badge">{i}</span>)}
                  </p>
                  <button
                    onClick={() => {
                      setEditingUserId(u._id);
                      setNewUserName(u.name);
                      setNewUserEmail(u.email);
                      setNewUserRole(u.role);
                      setNewUserInterests((u.interests || []).join(', '));
                    }}
                    style={{ marginRight: 8 }}
                  >
                    Edit
                  </button>
                  {u._id !== currentUser._id && (
                    <button onClick={() => handleDeleteUser(u._id)} style={{ color: 'red' }}>
                      Delete
                    </button>
                  )}
                </div>
              ))}

              <div className="pagination">
                <button
                  disabled={usersPage <= 1}
                  onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                >
                  ◀ Previous
                </button>
                <span>
                  Page {usersPage} of {usersTotalPages}
                </span>
                <button
                  disabled={usersPage >= usersTotalPages}
                  onClick={() => setUsersPage((p) => p + 1)}
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Public Posts */}
          {activeTab === 'posts' && (
            <div>
              <div className="card">
                <h4>Create Public Post</h4>
                <form onSubmit={handleCreatePost}>
                  <input
                    type="text"
                    placeholder="Post Title"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    required
                  />
                  <textarea
                    rows={3}
                    placeholder="Post Content"
                    value={postBody}
                    onChange={(e) => setPostBody(e.target.value)}
                    required
                  />
                  <button type="submit">Publish Post</button>
                </form>
              </div>

              <h3>All Public Posts</h3>
              {posts.map((p) => (
                <div key={p._id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h4 style={{ margin: 0 }}>{p.title}</h4>
                    <small>Author: {p.author?.name || 'Unknown'}</small>
                  </div>
                  <p style={{ margin: '8px 0' }}>{p.body}</p>
                  <small style={{ color: '#888' }}>
                    Posted: {new Date(p.createdAt).toLocaleString()}
                  </small>
                  {p.author?._id === currentUser._id && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => handleDeletePost(p._id)} style={{ color: 'red' }}>
                        Delete My Post
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <div className="pagination">
                <button
                  disabled={postsPage <= 1}
                  onClick={() => setPostsPage((p) => Math.max(1, p - 1))}
                >
                  ◀ Previous
                </button>
                <span>
                  Page {postsPage} of {postsTotalPages}
                </span>
                <button
                  disabled={postsPage >= postsTotalPages}
                  onClick={() => setPostsPage((p) => p + 1)}
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Aggregation: Group by Interests */}
          {activeTab === 'scenario1' && (
            <div>
              <h3>Group by Interests</h3>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b', fontWeight: 'bold' }}>
                    MongoDB Pipeline Constraint
                  </span>
                  <div style={{ marginTop: '4px', color: '#334155', fontSize: '14px' }}>
                    Uses exactly one <code>collection.aggregate()</code> call.
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 'bold' }}>
                    Pipeline Definition
                  </span>
                  <pre
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      overflowX: 'auto',
                      margin: '6px 0',
                    }}
                  >
{`User.aggregate([
  { $unwind: '$interests' },
  {
    $group: {
      _id: '$interests',
      count: { $sum: 1 },
      users: { $push: { _id: '$_id', name: '$name', email: '$email', role: '$role' } }
    }
  },
  { $sort: { _id: 1 } },
  { $project: { _id: 0, interest: '$_id', count: 1, users: 1 } }
])`}
                  </pre>
                </div>

                <div>
                  <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontWeight: 'bold' }}>
                    Index Support
                  </span>
                  <div style={{ marginTop: '4px', color: '#334155', fontSize: '14px' }}>
                    Supported by multikey index <code>userSchema.index(&#123; interests: 1 &#125;)</code>.
                  </div>
                </div>
              </div>

              <button onClick={fetchScenario1} style={{ marginBottom: 16 }}>
                Refresh Aggregation
              </button>

              {interestGroups.map((group) => (
                <div key={group.interest} className="card">
                  <h4>
                    Interest: <span style={{ color: '#2b6cb0' }}>"{group.interest}"</span> ({group.count} user{group.count > 1 ? 's' : ''})
                  </h4>
                  <ul>
                    {group.users.map((u) => (
                      <li key={u._id}>
                        <strong>{u.name}</strong> ({u.email}) - Role: {u.role}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: Aggregation: User Posts */}
          {activeTab === 'scenario2' && (
            <div>
              <h3>User Posts</h3>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b', fontWeight: 'bold' }}>
                    MongoDB Pipeline Constraint
                  </span>
                  <div style={{ marginTop: '4px', color: '#334155', fontSize: '14px' }}>
                    Retrieves all posts belonging to a particular user using a single aggregation pipeline with a <code>$lookup</code> stage.
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 'bold' }}>
                    Pipeline Definition
                  </span>
                  <pre
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      overflowX: 'auto',
                      margin: '6px 0',
                    }}
                  >
{`User.aggregate([
  { $match: { _id: userId } },
  {
    $lookup: {
      from: 'posts',
      localField: '_id',
      foreignField: 'author',
      as: 'posts'
    }
  }
])`}
                  </pre>
                </div>

                <div>
                  <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontWeight: 'bold' }}>
                    Index Support
                  </span>
                  <div style={{ marginTop: '4px', color: '#334155', fontSize: '14px' }}>
                    ForeignField lookup in <code>posts</code> is supported by index <code>postSchema.index(&#123; author: 1, createdAt: -1 &#125;)</code>.
                  </div>
                </div>
              </div>

              <div className="card">
                <label>Enter User ID or Click a Quick Select:</label>
                <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
                  <input
                    type="text"
                    placeholder="Enter Mongo ObjectId (e.g., from users tab)"
                    value={lookupUserId}
                    onChange={(e) => setLookupUserId(e.target.value)}
                  />
                  <button
                    onClick={() => handleScenario2Lookup(lookupUserId)}
                    disabled={!lookupUserId}
                  >
                    Run Aggregation
                  </button>
                </div>

                <div style={{ marginTop: 8 }}>
                  <small>Quick Select User:</small>{' '}
                  <button
                    onClick={() => {
                      setLookupUserId(currentUser._id);
                      handleScenario2Lookup(currentUser._id);
                    }}
                    style={{ marginRight: 6 }}
                  >
                    Me ({currentUser.name})
                  </button>
                </div>
              </div>

              {lookupResult && (
                <div className="card" style={{ background: '#f0fff4', borderColor: '#9ae6b4' }}>
                  <h4>User Profile from Aggregation:</h4>
                  <p>
                    <strong>Name:</strong> {lookupResult.name} | <strong>Email:</strong> {lookupResult.email} | <strong>Role:</strong> {lookupResult.role}
                    <br />
                    <strong>Total Posts Found via $lookup:</strong> {lookupResult.postCount}
                  </p>

                  <h5>Posts Retrieved from 'posts' Collection via $lookup:</h5>
                  {lookupResult.posts.length === 0 ? (
                    <p>This user has not authored any public posts yet.</p>
                  ) : (
                    lookupResult.posts.map((p) => (
                      <div key={p._id} style={{ background: '#fff', border: '1px solid #ccc', padding: 8, marginBottom: 8, borderRadius: 4 }}>
                        <strong>{p.title}</strong>
                        <p style={{ margin: '4px 0' }}>{p.body}</p>
                        <small style={{ color: '#888' }}>Created: {new Date(p.createdAt).toLocaleString()}</small>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

