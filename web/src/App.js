import React, { useState, useEffect, createRef } from 'react'
import './index.css'
import { CookiesProvider } from 'react-cookie';
import Dashboard from './Dashboard.js'
import Login from './Login.js'
import ErrorPage from "./error-page.js";
import Root from "./root.js";
import { useCookies } from 'react-cookie';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import {Buffer} from 'buffer';
import {io} from 'socket.io-client';


// wip:
const socket = io('http://localhost:5000');


function generateRandomString() {
	let randomString = '';
	const randomNumber = Math.floor(Math.random() * 10);

	for (let i = 0; i < 20 + randomNumber; i++) {
		randomString += String.fromCharCode(33 + Math.floor(Math.random() * 94));
	}

	return randomString;
}

function Router({children}) {
  const [cookies, setCookie, removeCookie] = useCookies(['sessionId', 'previewOn']);
  const [sessionId, setSessionId] = useState(cookies.sessionId || '');
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [discordLink, setDiscordLink] = useState('https://discord.com/api/oauth2/authorize?response_type=code&client_id=942541104627208272&scope=identify&redirect_uri=http%3A%2F%2Flocalhost%3A3000');
  const [img, setImg] = useState();
  const [discordInfo, setDiscordInfo] = useState('');
  const maxAge = 300;


  const routes = [
    {
      key: 'root',
      ret: <Root />,
      exit: true,
      enter: true,
    },
    {
      key: 'dashboard',
      ret: <Dashboard 
      socket={socket} 
      isLoggedIn={isAuthenticated} 
      img={img} 
      discordInfo={discordInfo}
      sessionId={sessionId}
      logout={logout}
      />,
      exit: true,
      enter: true,
    },
    {
      key: 'login',
      ret: <Login discordLink={discordLink}/>,
      exit: true,
      enter: true,
    }
  ]
  
  const routeMap = routes.map((props) => {
    const nodeRef = createRef(null);
  
    return (
      <CSSTransition
        key={props.key}
        nodeRef={nodeRef}
        exit={props.exit}
        enter={props.enter}
        appear={true}
        timeout={500}
        classNames="fade"
        >
        <div ref={nodeRef} className='centerthis'>
          {props.ret}
        </div>
      </CSSTransition>
    );
  }); 


  function logout() {
    setIsLoading(true);
    removeCookie('sessionId');
    socket.emit('logout', sessionId);
  };

  const search = new URLSearchParams(window.location.search);
  const code = search.get('code')
  const state = search.get('state');

  // this is running twice i think
  // this thing just keeps adding states to the url

  // this doesnt run initially since authenticated is null at first.
  // then when auth gets set to false, it gets run again
  useEffect(() => {
    console.log('isauthen', isAuthenticated);
    if (isAuthenticated !== null && !code) {
      // if (isAuthenticated === false && !code) {
      // if (isAuthenticated === false && code) {
      //   console.log('code i removed');
      //   // const buf = Buffer.from(decodeURIComponent(state), 'base64');
      //   // console.log('am i clickjacked? ', localStorage.getItem('oauthState') !== buf.toString('ascii'));
      //   // if (localStorage.getItem('oauthState') !== buf.toString('ascii')) {
      //   //   setIsClickjacked(true);
      //   //   // window.history.replaceState(null, '', window.location.origin);
      //   //   // alert('clickjacked!');
      //   //   console.log(`clickjacked! ${localStorage.getItem('oauthState')} doesn't match ${buf.toString('ascii')}`);
      //   // }
      // }
      // else {
          console.log('generated randomstring thing!');
          const randomString = generateRandomString();
          const buff = Buffer.from(randomString);
          const base64data = buff.toString('base64');
          localStorage.setItem('oauthState', randomString);
          setDiscordLink(link => link + `&state=${base64data}`)
        

    }
  }, [isAuthenticated]);
  // }, [code, state, isAuthenticated])

  useEffect(() => {
    socket.on('connect', () => {
        console.log('connection established to server');
    });
    
    // race condition. clickjack determination made before socket is ready
    // actually, the socket is ready before i can even tell if im clickjacked
    socket.on('ready', () => {
        if (sessionId) {
            console.log(`found sessionID ${sessionId}, emitting cookie auth request`);
            socket.emit('cookieAuthRequest', sessionId);
            // simulates api delay
            // setTimeout(function() {
            //     console.log('sending auth request!');
            //     socket.emit('cookieAuthRequest', sessionId);
            // }, 3000);
        // } else if (code && isClickjacked !== null) {
        } else if (code) {
            const buf = Buffer.from(decodeURIComponent(state), 'base64');
            const tempClickjacked = localStorage.getItem('oauthState') !== buf.toString('ascii')
            console.log('am i clickjacked? ', tempClickjacked);
            // if (localStorage.getItem('oauthState') !== buf.toString('ascii')) {
            //   setIsClickjacked(true);
            //   // window.history.replaceState(null, '', window.location.origin);
            //   console.log(`clickjacked! ${localStorage.getItem('oauthState')} doesn't match ${buf.toString('ascii')}`);
            // }
            if (tempClickjacked) {
              // if (isClickjacked) {
              alert('clickjacked!');
              console.log('finally popped the clickjacked thing');
              window.history.replaceState(null, '', window.location.origin);
              // setIsClickjacked(false);
              setIsAuthenticated(false);
              setIsLoading(false);
            } else {
              console.log('sending code auth request!');
              socket.emit('codeAuthRequest', { code: code });
              window.history.replaceState(null, '', window.location.origin);
            }
        } else {    
            console.log('set IsLoggedIn to false');
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    });

    socket.on('disconnect', ()=> {
        console.log('disconnected from the websocket server!')
    });

    socket.on('codeAuthSuccess', async (sessionId) => {
        console.log('auth success!');
        setIsAuthenticated(true);
        setSessionId(sessionId);
        setCookie('sessionId', sessionId, { path: '/', maxAge: maxAge, sameSite: "lax" });
        console.log('heres that payload i got', sessionId);
        socket.emit('requestUserPayload', sessionId);
    });
        
    socket.on('cookieAuthFail', (msg) => {
        removeCookie('sessionId');
        setIsAuthenticated(false);
        setIsLoading(false);
        console.log(`cookie auth failed due to ${msg}`);
    });

    socket.on('cookieAuthSuccess', () => {
        setIsAuthenticated(true);
        socket.emit('requestUserPayload', sessionId)
    });

    socket.on('discordError', (error) => {
        alert(error);
    });

    socket.on('logoutSuccess', () =>{
        setIsAuthenticated(false);
        setIsLoading(false);
        console.log('log out success');
    })

    socket.on('userPayload', async (res) => {
      console.log('got user payload!');
      const imageUrl = `https://cdn.discordapp.com/avatars/${res['id']}/${res['avatar']}`
      const userAvatar = await fetch(imageUrl);
      const imageBlob = await userAvatar.blob();
      const imageObjectURL = URL.createObjectURL(imageBlob);
      setImg(imageObjectURL);
      setDiscordInfo(res);
      setIsLoading(false);
    })

    // for the 'discord button' test button. remove this later
    socket.on('requestResponse', (res) => console.log('response is: ', res));
    socket.on('connect_error', () => {
      setTimeout(() => socket.connect(), 5000)});
    
    // this pops if they try to play something even though the session isnt valid anymore on discord's side?
    socket.on('invalidSession', () => {
      removeCookie('sessionId');
      socket.emit('logout', sessionId);
      window.open(discordLink, '_self');
    });

    // socket.on('cookieAuthSuccess', () => {
    //     setIsLoggedIn(true);
    // setIsLoading(false);
    //     console.log('cookie auth success!');
    //     // socket.emit('requestUserPayload', sessionId)
    // });

    // put a lot more cleanup here
    return () => {
        socket.off('ready');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('codeAuthSuccess');
        socket.off('cookieAuthFail');
        socket.off('cookieAuthSuccess');
        socket.off('discordError');
        socket.off('logoutSuccess');
        socket.off('requestResponse');
        socket.off('connect_error');
        socket.off('invalidSession');
    };
}, []);



  // let ret;
  // let key;
  // let exit;
  // let enter;
  // let nodeRef;
  let mapIndex;

  // lets do all the fetching stuff for "pages" here 
  // and once we fetch the needed info, we pass in the needed info to props to the component
  // and then set "loading" to false
  // just to keep this all clean, lets just have all the socket events in the websocke context?
  // logic: 
  // done loading + logged in => dashboard
  // done loading + logged out => login
  // loading => root

  if (isLoading === true) {
    // key = 'root';
    // ret = <Root />;
    // exit = true;
    // enter = true;
    // nodeRef = rootRef;
    mapIndex = 0;
  };
  if (isLoading === false && isAuthenticated === true) {
    // key = 'dashboard';
    // ret = <Dashboard 
    //         socket={socket} 
    //         isLoggedIn={isAuthenticated} 
    //         img={img} 
    //         discordInfo={discordInfo}
    //         sessionId={sessionId}
    //         logout={logout}
    //       />;
    // exit = false;
    // enter = true;
    // nodeRef = dashboardRef;
    mapIndex = 1;
  };
  if (isLoading === false && isAuthenticated === false) {
    // key = 'login';
    // ret = <Login discordLink={discordLink}/>;
    // exit = false;
    // enter = false;
    // nodeRef = loginRef;
    mapIndex = 2;
  };

  return (
    <TransitionGroup>
      {/* <CSSTransition
          key={key}
          nodeRef={nodeRef}
          appear={true}
          exit={exit}
          enter={enter}
          timeout={500}
          classNames="fade"
        > 
        <div ref={nodeRef} className='centerthis'>
         {ret}
        </div>
      </CSSTransition> */}
      {routeMap[mapIndex]}
  </TransitionGroup> 
  );
};

function App(props) {
  return (
    <CookiesProvider>
          <Router />
    </CookiesProvider>
  )
}


export default App;