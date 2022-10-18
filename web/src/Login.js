import React, { useState } from 'react';
import config from './config.json';
const bcrypt = require('bcrypt');
const saltRounds = 10;

// put an additional "Secret" field here so random people dont just login to the app


function LoginButton(props) {
    return (
      <button onClick={(e) => props.handleLogin()}>
        Login
      </button>
    );
  }

function SecretInput(props) {
  return (
    <form>
      <input 
        type="text" 
        value={props.inputText}
        onChange={(e) => props.setInputText(e.target.value)}
      />
    </form>
  )
}

// url hashing password
// https://stackoverflow.com/questions/28871866/send-bcrypt-hash-as-parameter
// https://neosmart.net/blog/2015/using-hmac-signatures-to-avoid-database-writes/
function Login(props) {
    const [inputText, setInputText] = useState('');
    const { discordLink } = props;

    function handleLogin() {
        if (inputText !== config.secret) return alert('secret is incorrect!');

        // need to check secret on client page itself
        // only generate needed parts of discord URL if secret is correct
        // https://stackoverflow.com/questions/43522050/bcrypt-hash-password-in-login-url

        bcrypt.genSalt(saltRounds, function(err, salt) {
          bcrypt.hash(inputText, salt, function(err, hash) {
              // Store hash in your password DB.
              });
          });


        window.location.href=discordLink;
      }
    
    // const handleInput = (event) => {
    //   console.log()
    //   event.preventDefault()
    // }

    return (
        <>
            <LoginButton handleLogin={handleLogin} />
            <SecretInput 
              inputText={inputText}
              setInputText={setInputText}
            />
            <h2>Login</h2>
        </>
    );
  };

export default Login