import React, {Component, useState } from 'react'
import './index.css'
import { useCookies } from 'react-cookie';
import useSound from 'use-sound';
import { ReactComponent as CogIcon} from './icons/cog.svg';
import { Navbar, NavItem } from './Navbar.js';

let soundsCache = {};
function importAll(r) {
  r.keys().forEach((key) => (soundsCache[key] = r(key)));
}
importAll(require.context('../../bot/sounds', false, /.opus$/));

// absolute path for sounds in preparation for build?
// rework it so we dont need to get a sound list from the bot 

function SoundButton(props) {
  const [playPreview] = useSound(soundsCache[props.sound]);

  return (
    <button className='button button1' onClick={(e) => props.previewOn ? playPreview() : props.playSound()}>
      {props.soundName} 
    </button>
  );
}

function DiscordText(props) {
  if (!props.userName) return null;
  return (
    <p>
      {props.userName + '#' + props.discriminator}
    </p>
  );
}

function DiscordAvatar(props) {
  if (!props.img) return null;
  return (
    <img src={props.img} alt="icons" />
  );
}

function SoundList(props) {
  const filterText = props.filterText;
  const sounds_array = [];

  function playSound(socket, message) {
    if (!props.isLoggedIn) return alert('you\'re not logged in!')
    socket.emit('pushButton', message);
  }

  // we should just do a map here.
  Object.keys(soundsCache).forEach((sound) => {
    const soundName = sound.slice(2, -5); //get rid of the "./" at beginning ".opus" at the end
    if (soundName.indexOf(filterText) === -1) {
      return;
    }


    sounds_array.push(
      <SoundButton 
        sound={sound}
        soundName={soundName}
        key={soundName}
        previewOn={props.previewOn}
        discordId={props.discordId}
        playSound={(e) => playSound(props.socket, {name: soundName, sessionId: props.sessionId})} />
    );
  })

  return (
    <div className="sound-container">
      {sounds_array}
    </div>
  );

}

class ConnectedUsers extends Component {
  render() {
    return (
      <p>
        placeholder for users
      </p>
    );
  }
}

function Options(props) {
  return (
    <p>
    <input 
      type="checkbox" 
      checked={props.previewOn} 
      onChange={(e) => {
        props.setPreviewOn(e.target.checked)
        // props.setCookie('previewOn', e.target.checked, { sameSite: 'strict' });
      }}
    />
    {' '}
    Preview Sound File
    </p>
  );
  
}

function SearchBar(props) {
    return (
      <form>
        <input 
          type="text" 
          placeholder="Search..." 
          value={props.filterText} 
          onChange={(e) => props.setFilterText(e.target.value)}
        />
      </form>
    );
}



function Dashboard(props) {
  const [cookies, setCookie, removeCookie] = useCookies(['sessionId', 'previewOn']);
  const [filterText, setFilterText] = useState('');
  const [previewOn, setPreviewOn] = useState( (cookies.previewOn === 'true') || false ); //since cookies convert boolean values to strings, we convert the strings to boolean values with "=== 'true'"
  const { socket, isLoggedIn, img, discordInfo, sessionId, logout } = props;

  // https://stackoverflow.com/questions/64261626/oauth2-authorization-code-flow-exchange-authorization-code-on-frontend-vs-back

  return (
          <>
            <Navbar>
            <NavItem icon={<CogIcon />} handleLogin={logout} />
            </Navbar>
            <div className="spacerthing">
            <SearchBar 
                filterText={filterText}
                setFilterText={setFilterText}
            />
            <Options 
                previewOn={previewOn}
                setPreviewOn={setPreviewOn}
                setCookie={setCookie}
            />
            <DiscordText
                userName={discordInfo['username']}
                discriminator={discordInfo['discriminator']}
            />
            <DiscordAvatar img={img}/>
            <ConnectedUsers />
            <SoundList 
                filterText={filterText}
                previewOn={previewOn} 
                socket={socket}
                isLoggedIn={isLoggedIn}
                sessionId={sessionId}
            />
            </div>
          </>
  )
}


export default Dashboard;