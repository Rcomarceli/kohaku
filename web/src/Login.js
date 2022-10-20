import React, { useState } from 'react';

function LoginButton(props) {
    return (
      <button onClick={(e) => props.handleLogin()}>
        Login
      </button>
    );
  }

function Login(props) {
    const [inputText, setInputText] = useState('');
    const { discordLink } = props;

    function handleLogin() {
        // if (inputText !== config.secret) return alert('secret is incorrect!');
        // https://stackoverflow.com/questions/43522050/bcrypt-hash-password-in-login-url
        window.location.href=discordLink;
      }

    return (
      // <div className="card-container">
      <div className="elevation-demo-container">
        <div className="card">
            <p>Kohaku Bot Dashboard</p>
            <LoginButton handleLogin={handleLogin} />
        </div>
      </div>
    );
  };

export default Login