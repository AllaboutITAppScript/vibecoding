import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { getCurrentUser } from "../api";

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const jwt = localStorage.getItem("jwt");
  // Not logged in? Go to the login page
  if (jwt == null) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    async function loadUser() {
      const objects = await getCurrentUser(jwt);
      if (objects["status"] === "ok") {
        setUser(objects["user"]);
      }
    }
    loadUser();
  }, [jwt]);

  function logout(e) {
    e.preventDefault();
    localStorage.removeItem("jwt");
    navigate("/login");
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-mynav">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            My App
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="fname"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {user ? user["fname"] : "..."}
                </a>
                <ul className="dropdown-menu" aria-labelledby="navbarDropdown">
                  <li>
                    <a className="dropdown-item" href="#" onClick={logout}>
                      Logout
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <div className="container-fluid p-3">
        <div className="card">
          <img
            className="p-2"
            src={user ? user["avatar"] : "/user.svg"}
            id="avatar"
            width="200"
            alt="avatar"
          />
          <div className="card-body">
            <p className="card-text" id="username">
              {user ? user["username"] : "..."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
