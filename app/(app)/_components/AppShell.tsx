'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/MenuRounded';
import HomeIcon from '@mui/icons-material/HomeRounded';
import PersonIcon from '@mui/icons-material/PersonRounded';
import CreditCardIcon from '@mui/icons-material/CreditCardRounded';
import CodeIcon from '@mui/icons-material/CodeRounded';
import ColorModeIconDropdown from '@/theme/ColorModeIconDropdown';
import SignOutButton from './SignOutButton';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: <HomeIcon /> },
  { label: 'My profile', href: '/profile', icon: <PersonIcon /> },
  { label: 'API docs', href: '/docs', icon: <CodeIcon /> },
] as const;

export default function AppShell({ email, children }: { email: string | null; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100%' }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={closeMobile}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        <NavContent email={email} onNavigate={closeMobile} />
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <NavContent email={email} />
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{ display: { md: 'none' }, borderBottom: 1, borderColor: 'divider' }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <IconButton edge="start" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Wordmark />
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, sm: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

function NavContent({ email, onNavigate }: { email: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <Stack sx={{ height: '100%' }}>
      <Toolbar>
        <Wordmark />
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.href}
            component={Link}
            href={item.href}
            selected={pathname === item.href}
            onClick={onNavigate}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <ListItemButton disabled sx={{ borderRadius: 1 }}>
          <ListItemIcon>
            <CreditCardIcon />
          </ListItemIcon>
          <ListItemText primary="Billing" />
          <Chip label="Soon" size="small" />
        </ListItemButton>
      </List>
      <Divider />
      <Stack sx={{ p: 2, gap: 1.5 }}>
        <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }} title={email ?? undefined}>
          {email}
        </Typography>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <Box sx={{ flexGrow: 1 }}>
            <SignOutButton />
          </Box>
          <ColorModeIconDropdown />
        </Stack>
      </Stack>
    </Stack>
  );
}

function Wordmark() {
  return (
    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
      FlightPaths
    </Typography>
  );
}
