import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCookies } from 'react-cookie';
import {io} from 'socket.io-client';
import {Buffer} from 'buffer';


// https://www.kianmusser.com/articles/react-where-put-websocket/
export const WebsocketContext = React.createContext();

// without the "ready" value, useEffects will often run BEFORE the socket is ready

// const socket = io('http://localhost:5000');
function generateRandomString() {
	let randomString = '';
	const randomNumber = Math.floor(Math.random() * 10);

	for (let i = 0; i < 20 + randomNumber; i++) {
		randomString += String.fromCharCode(33 + Math.floor(Math.random() * 94));
	}

	return randomString;
}

export const WebsocketProvider = ({children}) => {
    const [cookies, setCookie, removeCookie] = useCookies(['sessionId', 'previewOn']);
    const [sessionId, setSessionId] = useState(cookies.sessionId || '');
    // we use useRef since it doesnt trigger re-render
    const ws = useRef(null);
    const [isLoggedIn, setIsLoggedIn] = useState(null);
    const [isReady, setIsReady] = useState(false);
    // requirements for "loaded" ==> Socket is connected and we know if user is authenticted or not 
    const [isLoading, setIsLoading] = useState(true);
    const [discordLink, setDiscordLink] = useState('https://discord.com/api/oauth2/authorize?response_type=code&client_id=942541104627208272&scope=identify&redirect_uri=http%3A%2F%2Flocalhost%3A3000');


    const search = new URLSearchParams(window.location.search);
    console.log('search is', search);
    const code = search.get('code')
    const state = search.get('state');


    useEffect(() => {
        if (!code) {
          console.log('generated randomstring thing!');
          const randomString = generateRandomString();
          const buff = Buffer.from(randomString);
          const base64data = buff.toString('base64');
          localStorage.setItem('oauthState', randomString);
          setDiscordLink(link => link + `&state=${base64data}`)
        }
        else {
          const buf = Buffer.from(decodeURIComponent(state), 'base64');
          if (localStorage.getItem('oauthState') !== buf.toString('ascii')) {
            alert('clickjacked!');
            console.log(`clickjacked! ${localStorage.getItem('oauthState')} doesn't match ${buf.toString('ascii')}`);
          }
        }
      }, [code, state])
  

    useEffect(() => {
        // move this up later?
        const socket = io('http://localhost:5000');

        socket.on('connect', () => {
            console.log('connection established to server');
            console.log('connect event cookieauthrequest popped');
        });
        
        socket.on('ready', () => {
            setIsReady(true);
            if (sessionId) {
                console.log(`found sessionID ${sessionId}, emitting cookie auth request`);
                // socket.emit('cookieAuthRequest', sessionId);
                
                // simulates api delay
                setTimeout(function() {
                    console.log('sending auth request!');
                    socket.emit('cookieAuthRequest', sessionId);
                }, 3000);
            } else if (code) {
                console.log('sending code auth request!');
                socket.emit('codeAuthRequest', { code: code });
                window.history.replaceState(null, '', window.location.origin);
            } else {    
                console.log('set IsLoggedIn to false');
                setIsLoggedIn(false);
            }
        });

        socket.on('disconnect', ()=> {
            setIsReady(false);
            console.log('disconnected from the websocket server!')
        });

        socket.on('codeAuthSuccess', async (sessionId) => {
            console.log('auth success!');
            setIsLoggedIn(true);
            setSessionId(sessionId);
            setCookie('sessionId', sessionId, { path: '/', maxAge: 300, sameSite: 'lax' });
            console.log('heres that payload i got', sessionId);
            socket.emit('requestUserPayload', sessionId);
        });
            
        socket.on('cookieAuthFail', (msg) => {
            setIsLoggedIn(false);
            console.log(`cookie auth failed due to ${msg}`);
        });

        socket.on('cookieAuthSuccess', () => {
            setIsLoggedIn(true);
            socket.emit('requestUserPayload', sessionId)
        });

        socket.on('discordError', (error) => {
            alert(error);
        });

        socket.on('logoutSuccess', () =>{
            setIsLoggedIn(false);
            console.log('log out success');
        })

        // socket.on('cookieAuthSuccess', () => {
        //     setIsLoggedIn(true);
        //     console.log('cookie auth success!');
        //     // socket.emit('requestUserPayload', sessionId)
        // });


        ws.current = socket;

        // put a lot more cleanup here
        return () => {
            socket.off('connect');
            socket.off('disconnect');
        };
    }, []);

    const ret = [ws.current, isReady, isLoggedIn, discordLink];
    
    return (
        <WebsocketContext.Provider value={ret}>
            {children}
        </WebsocketContext.Provider>
    );
};


