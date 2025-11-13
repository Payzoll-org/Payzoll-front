import { useState } from "react";
import { useAuthStore } from "../Zustand/userStore";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const login = useAuthStore((s) => s.login);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(form.email, form.password);
    window.location.href = "/dashboard";
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-72 mx-auto mt-10">
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} />
      <button type="submit">Login</button>
    </form>
  );
}