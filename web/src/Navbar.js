export function Navbar(props) {
    return (
      <nav className="navbar">
        <ul className="navbar-nav">{props.children}</ul>
      </nav>
    );
  }

export function NavItem(props) {
    return (
      <li className="nav-item right">
        <button className="icon-button" onClick={(e) => props.handleLogin()}>
        {/* <a href="#" className="icon-button"> */}
          {props.icon}
        </button>
      </li>
    );
  }