import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Nuevo() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      type: "bot",
      content: `Soy Asistente de Gestión de Requerimientos.

Te ayudaré a crear tu requerimiento paso a paso.

¿Cuál es tu nombre? 😃👋🏻💙`,
    },
  ]);

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { type: "user", content: input }]);
    setInput("");
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles([...files, ...Array.from(event.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="nuevo-page">
      {/* HEADER */}
      <header className="main-header">
        <div className="header-container">
          <nav className="nav-menu">
            <a href="#" className="logo" onClick={() => navigate("/inicio")}>
              <img src="/img/logo-blanco.png" alt="Logo Empresa" />
            </a>
            <div className="nav-links">
              <a href="#" onClick={() => navigate("/inicio")}>Inicio</a>
              <a href="#" onClick={() => navigate("/mis-requerimientos")}>Mis Requerimientos</a>
              <a href="#" onClick={() => navigate("/validacion")}>Validación</a>
            </div>
            <div className="nav-actions">
              <a href="#" className="perfil-btn">
                <img src="/img/avatar.png" alt="Perfil" />
              </a>
              <a href="#" className="logout-btn" onClick={() => navigate("/")}>
                <img src="/img/log-out.png" alt="Salir" />
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* CHATBOT */}
      <main className="main-content-bot">
        <section className="chatbot-full">
          {/* MENSAJES */}
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                {msg.type === "bot" && (
                  <div className="message-icon">
                    <img src="/img/bot.png" alt="Bot" />
                  </div>
                )}
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
          </div>

          {/* INPUT */}
          <div className="chat-input-area">
            <div className="input-box">
              <label htmlFor="fileInput" className="attach-btn">📎</label>
              <input
                type="file"
                id="fileInput"
                multiple
                onChange={handleFiles}
              />

              <div className="file-preview">
                {files.map((file, idx) => (
                  <div key={idx} className="file-chip">
                    {file.name}
                    <button onClick={() => removeFile(idx)}>x</button>
                  </div>
                ))}
              </div>

              <textarea
                placeholder="Escribe tu mensaje..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage}>➤</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}