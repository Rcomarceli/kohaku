import React, { Component, useContext, useEffect, useState, useMemo } from 'react';
import { useCookies } from 'react-cookie';
import { WebsocketContext } from './Websocket/websocket-context.js'
import { Navigate, useLocation } from "react-router-dom";
import { Navbar, NavItem } from './Navbar.js';
import { ReactComponent as CogIcon} from './icons/cog.svg';

// import {Buffer} from 'buffer';


// function generateRandomString() {
// 	let randomString = '';
// 	const randomNumber = Math.floor(Math.random() * 10);

// 	for (let i = 0; i < 20 + randomNumber; i++) {
// 		randomString += String.fromCharCode(33 + Math.floor(Math.random() * 94));
// 	}

// 	return randomString;
// }


// put an additional "Secret" field here so random people dont just login to the app
function DiscordButton(props) {
    return (
      <button onClick={(e) => props.handleDiscordButton(props.socket)}>
        discord Button
      </button>
    );
  }

function LoginButton(props) {
    return (
      <button onClick={(e) => props.handleLogin()}>
        Login
      </button>
    );
  }
  
function LogoutButton(props) {
    return (
      <button onClick={(e) => props.handleLogin()}>
        Logout
      </button>
    );
  }
  
// function RedirectToDashboard(props) {
//     if (props.isLoggedIn) return <Navigate to="/dashboard" />;
//     return null;
// }

function Login(props) {
    // const [socket, isSocketReady, isLoggedIn, discordLink] = useContext(WebsocketContext);
    const { discordLink } = props;
    function handleLogin() {
          window.location.href=discordLink;
      }

    

    // const search = new URLSearchParams(window.location.search);
    // const code = search.get('code')
    // const state = search.get('state');
  
    // useEffect(() => {
    //   if (!code) {
    //     console.log('generated randomstring thing!');
    //     const randomString = generateRandomString();
    //     const buff = Buffer.from(randomString);
    //     const base64data = buff.toString('base64');
    //     localStorage.setItem('oauthState', randomString);
    //     setDiscordLink(link => link + `&state=${base64data}`)
    //   }
    //   else {
    //     const buf = Buffer.from(decodeURIComponent(state), 'base64');
    //     if (localStorage.getItem('oauthState') !== buf.toString('ascii')) {
    //       alert('clickjacked!');
    //       console.log(`clickjacked! ${localStorage.getItem('oauthState')} doesn't match ${buf.toString('ascii')}`);
    //     }
    //   }
    // }, [code, state])

    // // dont move this to websocket context because we just want this behavior on login
    // useEffect(() => {
    //   // we want to do this while loading
    //   // but while loading, this component isnt rendered
    //   // so we just should move this logic into the "loading" part, which would just be the websocket context
    //     if (isSocketReady) {
    //       // by the time the socket is connected, it's already past the ready event
    //       // we should just put this logic in the websocket itself...?
    //       if (code) {
    //           console.log('sending code auth request!');
    //           socket.emit('codeAuthRequest', { code: code });
    //           window.history.replaceState(null, '', window.location.origin);
    //         };
    //     }

    // }, [isSocketReady]);

    return (
        <>
            {/* <RedirectToDashboard isLoggedIn={isLoggedIn} /> */}
            <LoginButton handleLogin={handleLogin} />
            <h2>Login</h2>
        </>
    );
  };

export default Login