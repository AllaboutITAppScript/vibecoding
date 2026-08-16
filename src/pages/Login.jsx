import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { login } from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Already logged in? Go straight to the profile page
  if (localStorage.getItem("jwt") != null) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const objects = await login(username, password);
    console.log(objects);
    if (objects["status"] === "ok") {
      localStorage.setItem("jwt", objects["accessToken"]);
      Swal.fire({
        text: objects["message"],
        icon: "success",
        confirmButtonText: "OK",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/");
        }
      });
    } else {
      Swal.fire({
        text: objects["message"],
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  }

  return (
    <main className="form-signin">
      <form onSubmit={handleSubmit}>
        <img className="mb-4" src="/logo.svg" alt="" height="300" />
        <h1 className="h3 mb-3 fw-normal">
          <b>My App</b> - Login
        </h1>
        <div className="form-floating">
          <input
            type="email"
            className="form-control"
            id="username"
            placeholder="name@example.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label htmlFor="username">Email address</label>
        </div>
        <div className="form-floating">
          <input
            type="password"
            className="form-control"
            id="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label htmlFor="password">Password</label>
        </div>
        <button className="w-100 btn btn-lg btn-primary mt-3" type="submit">
          Login
        </button>
        <p className="mt-5 mb-3 text-muted">
          <a href="https://www.freepik.com/free-photos-vectors/technology">
            Technology vector created by freepik - www.freepik.com
          </a>
        </p>
      </form>
    </main>
  );
}
