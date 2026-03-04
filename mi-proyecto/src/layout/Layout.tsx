import { ReactNode } from "react";
import { AppBar, Toolbar, Typography, Box } from "@mui/material";

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" noWrap>
            Portal de Requerimientos
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}