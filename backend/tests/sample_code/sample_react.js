// Sample React Component for Manual Testing
// Expected noise: imports, error handling, logging, guard clauses
// Expected clear: core logic (useState, useEffect, JSX rendering)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const UserDashboard = ({ userId, onError }) => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        console.warn('No user ID provided');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching user data for:', userId);

        // Fetch user profile
        const userResponse = await axios.get(`/api/users/${userId}`);
        console.log('User data received:', userResponse.data);
        setUser(userResponse.data);

        // Fetch user posts
        const postsResponse = await axios.get(`/api/users/${userId}/posts`);
        console.log('Posts data received:', postsResponse.data);
        setPosts(postsResponse.data);

      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message);
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, onError]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="user-dashboard">
      <header className="user-header">
        <img src={user.avatar} alt={user.name} />
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </header>

      <section className="user-stats">
        <div className="stat">
          <span className="stat-label">Posts</span>
          <span className="stat-value">{posts.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Followers</span>
          <span className="stat-value">{user.followers}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Following</span>
          <span className="stat-value">{user.following}</span>
        </div>
      </section>

      <section className="user-posts">
        <h2>Recent Posts</h2>
        {posts.map(post => (
          <article key={post.id} className="post">
            <h3>{post.title}</h3>
            <p>{post.content}</p>
            <time>{new Date(post.createdAt).toLocaleDateString()}</time>
          </article>
        ))}
      </section>
    </div>
  );
};

UserDashboard.propTypes = {
  userId: PropTypes.number.isRequired,
  onError: PropTypes.func,
};

export default UserDashboard;
