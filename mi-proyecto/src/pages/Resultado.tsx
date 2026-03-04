import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Typography,
  Avatar,
  Card,
  CardContent,
  Chip,
  IconButton,
  Divider,
} from "@mui/material";

import { useNavigate } from "react-router-dom";

export default function Resultado() {
  const navigate = useNavigate();

  const irAtrasSegunRol = () => {
    navigate("/mis-requerimientos");
  };

  const descargarPDF = () => {
    console.log("Descargar PDF");
  };

  return (
    <Box>

      {/* HEADER */}
      <AppBar position="static">
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <img
              src="/img/logo-blanco.png"
              alt="Logo Empresa"
              style={{ height: 40, cursor: "pointer" }}
              onClick={() => navigate("/inicio")}
            />

            <Button color="inherit" onClick={() => navigate("/inicio")}>
              Inicio
            </Button>

            <Button color="inherit" onClick={() => navigate("/mis-requerimientos")}>
              Mis Requerimientos
            </Button>

            <Button color="inherit" onClick={() => navigate("/validacion")}>
              Validación
            </Button>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate("/perfil")}>
              <Avatar src="/avatar.png" />
            </IconButton>

            <Button color="inherit" onClick={() => navigate("/")}>
              Salir
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* CONTENIDO */}
      <Box sx={{ p: 4 }}>

        {/* PAGE HEADER */}
        <Box mb={4}>
          <Typography variant="h4">
            Documento Técnico Generado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Revisa el levantamiento generado antes de enviar la solicitud del Requerimiento.
          </Typography>
        </Box>

        {/* CARD RESULTADO */}
        <Card>
          <CardContent>

            {/* TOP BAR */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Chip
                label="Listo para aprobación"
                color="success"
              />

              <Button
                variant="outlined"
                onClick={irAtrasSegunRol}
              >
                Volver
              </Button>
            </Box>

            {/* DOCUMENTO */}
            <Box
              sx={{
                minHeight: 200,
                p: 2,
                border: "1px solid #ddd",
                borderRadius: 2,
                mb: 4,
              }}
            >
              <Typography>
                Cargando documento técnico...
              </Typography>
            </Box>

            {/* ADJUNTOS */}
            <Box mb={4}>
              <Typography variant="h6" mb={2}>
                Archivos Adjuntos
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 2,
                }}
              >
                {/* Aquí irían los adjuntos dinámicos */}
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* BOTONES */}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={descargarPDF}
              >
                📥 Descargar
              </Button>
            </Box>

          </CardContent>
        </Card>

      </Box>
    </Box>
  );
}